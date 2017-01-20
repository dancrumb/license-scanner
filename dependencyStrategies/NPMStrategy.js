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
      uri: `http://registry.npmjs.org/${packageName}`,
      method: 'GET',
      json: true,
    })
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          console.error(`Package '${packageName}' is not on NPM. The wrong strategy was selected`);
          throw new Error(`Incorrect Strategy used for ${packageName}`);
        }
        console.log(`Status Code Error for ${packageName}`);
        throw new Error(reason);
      });
  }

  return packageCache[packageName];
}

function getVersionDetails(packageDetails, semVersion) {
  const targetVersion = semver.maxSatisfying(Object.keys(packageDetails.versions), semVersion);
  return packageDetails.versions[targetVersion];
}

class NPMStrategy extends DependencyStrategy {
  constructor(packageName, semVer) {
    super(packageName, semVer);
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
      const versionDetails = getVersionDetails(packageDetails, this.semVer);
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

export default NPMStrategy;
