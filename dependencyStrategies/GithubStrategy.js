/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';

import DependencyStrategy from './DependencyStrategy';

const packageCache = {};
function getPackageDetails(owner, repo) {
  if (!packageCache[`${owner}/${repo}`]) {
    packageCache[`${owner}/${repo}`] = rp.get({
      uri: `https://api.github.com/repos/${owner}/${repo}/license`,
      method: 'GET',
      headers: {
        'User-Agent': 'License-Checker'
      },
      json: true,
    })
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          return {
            license: {
              spdx_id: 'UNLICENSED',
            },
          };
        }
        console.error(`https://api.github.com/repos/${owner}/${repo}/license`);
        console.error(reason);
        throw new Error(`Unexpected status when trying to pull license for ${owner}/${repo} from Github: ${reason.statusCode}`);
      })
      .then(licenseInfo => ({
        license: {
          raw: licenseInfo.license.spdx_id,
          corrected: licenseInfo.license.spdx_id,
        },
      }));
  }

  return packageCache[`${owner}/${repo}`];
}

const DESTRUCTORS = [
  /github:([^/]*)\/(.*)/,
  /git:\/\/github.com\/([^/]*)\/([^/]*).git/,
];

function getOwnerAndRepo(string) {
  const destructor = DESTRUCTORS.find(pattern => pattern.test(string));
  return string.match(destructor);
}

class GithubStrategy extends DependencyStrategy {
  constructor(packageName, semVer) {
    super();
    this.packageName = packageName;
    const [__, owner, repoName] = getOwnerAndRepo(semVer);
    this.owner = owner;
    this.repoName = repoName;

    this.details = getPackageDetails(owner, repoName);
  }

  getName() {
    return this.packageName;
  }

  getSemver() {
    return this.semVer;
  }


  getLicense() {
    return this.details.then(packageDetails => packageDetails.license);
  }

  getRepo() {
    return Promise.resolve(`https://github.com/${this.owner}/${this.repo}`);
  }

}

export default GithubStrategy;
