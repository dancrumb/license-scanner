/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';
import semver from 'semver';
import DependencyStrategy from './DependencyStrategy';
import RubyGemsParser from '../parsers/RubyGemsParser';

const arrayToObject = (a, key) => a.reduce((o, ae) => Object.assign(o, { [ae[key]]: ae }), {});
const packageCache = {};
function getPackageDetails(packageName) {
  if (!packageCache[packageName]) {
    packageCache[packageName] = rp.get({
      uri: `https://rubygems.org/api/v1/gems/${packageName}.json`,
      method: 'GET',
      json: true,
    })
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          console.error(`Package '${packageName}' is not on RubyGems. The wrong strategy was selected`);
          throw new Error(`Incorrect Strategy used for ${packageName}`);
        }
        console.error(`Status Code Error for ${packageName}`);
        throw new Error(reason);
      })
      .then(details => rp.get({
        uri: `https://rubygems.org/api/v1/versions/${packageName}.json`,
        method: 'GET',
        json: true,
      }).then(versions =>
        Object.assign(details, { versions: arrayToObject(versions.filter(v => semver.valid(v.number)), 'number') })));
  }

  return packageCache[packageName];
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
    throw new Error(`Invalid RubyGem version specifier: ${specifier}`);
  } else {
    return specifier;
  }
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
