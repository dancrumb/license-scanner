/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';
import semver from 'semver';
import _ from 'lodash';
import DependencyStrategy from './DependencyStrategy';
import RubyGemsParser from '../parsers/RubyGemsParser';

const validVersion = vs => vs.filter(v => semver.valid(v.number));
const injectVersions = (d, vs) => Object.assign(d, { versions: _.keyBy(validVersion(vs), 'number') });

const handleRubyGemsError = (packageName, reason) => {
  if (reason.statusCode === 404) {
    throw new Error(`Incorrect Strategy used for ${packageName}`);
  }
  if (reason.statusCode === 429) {
    throw new Error('Rate limited by RubyGems');
  }

  throw new Error(`Status Code Error for ${packageName}: ${reason.statusCode}`);
};

const rubyGemsAPICall = (packageName, resource) => rp.get({
  uri: `https://rubygems.org/api/v1/${resource}/${packageName}.json`,
  method: 'GET',
  json: true,
})
  .catch(rpErrors.StatusCodeError, reason => handleRubyGemsError(packageName, reason));

const getPackageVersions = (packageName, details) => rubyGemsAPICall(packageName, 'versions')
  .then(versions => injectVersions(details, versions));

function getPackageDetails(packageName) {
  return rubyGemsAPICall(packageName, 'gems')
      .then(details => getPackageVersions(packageName, details));
}

function gemfileSpecifierToSemver(specifier) {
  if (/~>.*/.test(specifier)) {
    const [, major, minor, patch] = specifier.match(/~>\s*(?:(\d+)(?:\.(\d+)(?:\.(\d+))?)?)?/);
    if (patch !== undefined) {
      return `>= ${major}.${minor}.${patch} < ${major}.${+minor + 1}.0`;
    }
    if (minor !== undefined) {
      return `>= ${major}.${minor} < ${+major + 1}.0`;
    }
    if (major !== undefined) {
      return `>= ${major}.0.0 < ${+major + 1}.0.0`;
    }
    throw new Error(`Invalid RubyGem version specifier: ${specifier}`);
  }

  return specifier;
}

class RubyGemsStrategy extends DependencyStrategy {
  constructor(packageName, versionSpecifier) {
    super(packageName, versionSpecifier);
    this.semVer = gemfileSpecifierToSemver(versionSpecifier);
    this.details = getPackageDetails(packageName);
    this.parser = RubyGemsParser;
  }

  getRepo() {
    return this.details.then((packageDetails) => {
      const versionInfo = packageDetails.versions;
      const possibleVersions = Object.keys(versionInfo);
      if (!possibleVersions) {
        console.error(`No versions found for ${packageDetails.name}`);
      }

      const targetVersion = semver.maxSatisfying(possibleVersions, this.semVer);
      const versionDetails = versionInfo[targetVersion];

      const repoUri = versionDetails.source_code_uri || packageDetails.source_code_uri;
      if (/github/.test(repoUri)) {
        return {
          url: repoUri,
          type: 'git',
        };
      }
      return {
        url: repoUri,
        type: 'unknown',
      };
    });
  }

}

export default RubyGemsStrategy;
