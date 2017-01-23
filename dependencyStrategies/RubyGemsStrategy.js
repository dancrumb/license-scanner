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
        console.log(`Status Code Error for ${packageName}`);
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

function getVersionDetails(packageDetails, semVersion) {
  const targetVersion = semver.maxSatisfying(packageDetails.versionList, semVersion);
  return packageDetails.versions[targetVersion];
}

class RubyGemsStrategy extends DependencyStrategy {
  constructor(packageName, versionSpecifier) {
    super(packageName, versionSpecifier);
    this.semVer = gemfileSpecifierToSemver(versionSpecifier);
    this.details = getPackageDetails(packageName);
  }

  getName() {
    return this.packageName;
  }

  getSemver() {
    return this.semVer;
  }


  getLicense() {
    return this.details.then(details => RubyGemsParser.parse(details, this.semVer));
  }

  getRepo() {
    return this.details.then((packageDetails) => {
      const versionInfo = packageDetails.versions;
      const possibleVersions = Object.keys(versionInfo);
      if (!possibleVersions) {
        console.log(`No versions found for ${packageDetails.name}`);
      }
      console.log(packageDetails.name, possibleVersions, this.semVer);
      const targetVersion = semver.maxSatisfying(possibleVersions, this.semVer);
      const versionDetails = versionInfo[targetVersion];
      console.log(versionDetails);
      const repo = versionDetails.repository || packageDetails.repository;
      return repo;
    });
  }

}

export default RubyGemsStrategy;
