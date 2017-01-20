/**
 * Created by danrumney on 1/17/17.
 */
import eventToPromise from 'event-to-promise';
import bower from 'bower';

import DependencyStrategy from './DependencyStrategy';
import GithubStrategy from './GithubStrategy';

const packageCache = {};
function getPackageDetails(packageName) {
  if (!packageCache[packageName]) {
    const bowerInfo = bower.commands.lookup(packageName);

    packageCache[packageName] = eventToPromise(bowerInfo, ['end'], ['error'])
      .catch(() => {
        throw new Error(`Could not find ${packageName}`);
      });
  }

  return packageCache[packageName];
}

class BowerStrategy extends DependencyStrategy {
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
    return this.details.then(packageDetails =>
      new GithubStrategy(this.packageName, packageDetails.url).getLicense());
  }

  getRepo() {
    return this.details.then(packageDetails => packageDetails.url);
  }

}

export default BowerStrategy;
