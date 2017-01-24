/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';
import semver from 'semver';

import DependencyStrategy from './DependencyStrategy';
import PackageParser from '../parsers/PackageParser';

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
        console.error(`Status Code Error for ${packageName}`);
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
    this.parser = PackageParser;
  }

  getRepo() {
    return this.details.then((packageDetails) => {
      const versionDetails = getVersionDetails(packageDetails, this.semVer);
      return versionDetails.repository || packageDetails.repository;
    });
  }

}

export default NPMStrategy;
