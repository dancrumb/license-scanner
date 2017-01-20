/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';
import semver from 'semver';
import DependencyStrategy from './DependencyStrategy';

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
      .then((details) => {
        // eslint-disable-next-line no-param-reassign
        details.versions = rp.get({
          uri: `https://rubygems.org/api/v1/versions/${packageName}.json`,
          method: 'GET',
          json: true,
        });
        return details;
      });
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
  const targetVersion = semver.maxSatisfying(Object.keys(packageDetails.versions), semVersion);
  return packageDetails.versions[targetVersion];
}

class RubyGemsStrategy extends DependencyStrategy {
  constructor(packageName, versionSpecifier) {
    super();
    this.packageName = packageName;
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
    return this.details.then((packageDetails) => {
      const versionInfo = packageDetails.versions;
      const possibleVersions = versionInfo.map(info => info.number);
      console.log(possibleVersions);
      const targetVersion = semver.maxSatisfying(possibleVersions, this.semVer);
      console.log(targetVersion);
      const versionDetails = versionInfo.find(info => info.number === targetVersion);
      console.log(versionDetails);
      if (!versionDetails) {
        throw new Error(`No details found for ${this.semVer} of ${this.packageName}`);
      }
      const mergedDetails = Object.assign({}, packageDetails, versionDetails);
      return this.extractSPDXLicense(mergedDetails);
    });
  }

  getRepo() {
    return this.details.then((packageDetails) => {
      const versionDetails = getVersionDetails(packageDetails, this.semVer);
      const repo = versionDetails.repository || packageDetails.repository;
      return repo;
    });
  }

}

export default RubyGemsStrategy;
