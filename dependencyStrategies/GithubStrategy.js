/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';
import { inferLicense } from 'infer-license';

import DependencyStrategy from './DependencyStrategy';

const packageCache = {};
function getPackageDetails(owner, repo) {
  if (!packageCache[`${owner}/${repo}`]) {
    packageCache[`${owner}/${repo}`] = rp.get({
      uri: `https://api.github.com/repos/${owner}/${repo}/license`,
      method: 'GET',
      headers: {
        'User-Agent': 'License-Checker',
      },
      json: true,
    })
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          console.error(`404 from https://api.github.com/repos/${owner}/${repo}/license`);
          return {
            license: {
              spdx_id: 'UNLICENSED',
            },
          };
        }
        if (reason.statusCode === 403) {
          throw new Error('Looks like we got ourselves rate-limited');
        }
        console.error(`https://api.github.com/repos/${owner}/${repo}/license`);
        console.error(reason);
        throw new Error(`Unexpected status when trying to pull license for ${owner}/${repo} from Github: ${reason.statusCode}`);
      })
      .then(licenseInfo => ({
        content: licenseInfo.content,
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
  /[^:]*:\/\/github.com\/([^/]*)\/([^/]*).git/,
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
    if (!__) {
      throw new Error(`No match for ${semVer}`);
    }
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
    return this.details.then(packageDetails => packageDetails.license)
      .then((license) => {
        console.log(license);
        if (!license.raw) {
          console.error('No License found via API');
          return this.details.then(packageDetails => packageDetails.content)
            .then((licenseContent) => {
              const b = new Buffer(licenseContent, 'base64');
              const licenseText = b.toString();
              return {
                raw: inferLicense(licenseText),
                corrected: inferLicense(licenseText),
              };
            });
        }
        return license;
      });
  }

  getRepo() {
    return Promise.resolve(`https://github.com/${this.owner}/${this.repo}`);
  }

}

export default GithubStrategy;
