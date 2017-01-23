/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';

import TextParser from '../parsers/TextParser';
import NoLicenseError from '../parsers/NoLicenseError';
import DependencyStrategy from './DependencyStrategy';
import GithubContentStrategy from '../contentStrategies/GithubStrategy';

const base64ToString = b64 => (new Buffer(b64, 'base64')).toString();

const packageCache = {};
function getPackageDetails(owner, repo) {
  if (!packageCache[`${owner}/${repo}`]) {
    packageCache[`${owner}/${repo}`] = rp.get({
      uri: `https://api.github.com/repos/${owner}/${repo}/license`,
      method: 'GET',
      headers: {
        'User-Agent': 'License-Checker',
      },
      auth: {
        user: process.env.GITHUB_USER,
        password: process.env.GITHUB_AUTH,
      },
      json: true,
    })
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          console.error(`404 from https://api.github.com/repos/${owner}/${repo}/license`);
          return {
            license: {
              spdx_id: undefined,
            },
          };
        }
        if (reason.statusCode === 403) {
          throw new Error('Looks like we got ourselves rate-limited');
        }
        if (reason.statusCode === 401) {
          throw new Error('Looks like your authentication details are bad. Check GITHUB_USER and GITHUB_AUTH');
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
          source: 'Github API License, Reported',
        },
      }));
  }

  return packageCache[`${owner}/${repo}`];
}

const DESTRUCTURERS = [
  /github:([^/]*)\/(.*)/,
  /[^:]*:\/\/github.com\/([^/]*)\/([^/]*).git/,
];

function getOwnerAndRepo(string) {
  const destructor = DESTRUCTURERS.find(pattern => pattern.test(string));
  const [, owner, repo] = string.match(destructor);
  if (!owner) {
    throw new Error(`No owner/repo match for ${string}`);
  }
  return [owner, repo];
}

class GithubStrategy extends DependencyStrategy {
  constructor(packageName, semVer) {
    super(packageName, semVer);
    [this.owner, this.repoName] = getOwnerAndRepo(semVer);
    this.contentStrategy = new GithubContentStrategy(this.owner, this.repoName);

    this.details = getPackageDetails(this.owner, this.repoName);
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
        console.log(this.packageName);
        console.log(license);
        if (!license.raw) {
          throw new NoLicenseError();
        }
        return license;
      })
      .catch(() => this.details.then(packageDetails => packageDetails.content)
          .then((licenseContent) => {
            const licenseText = base64ToString(licenseContent);
            return TextParser.parse(licenseText, 'Github API License');
          }))
      .catch(() => DependencyStrategy.pullLicenseInfo(this.contentStrategy));
  }

  getRepo() {
    return Promise.resolve(`https://github.com/${this.owner}/${this.repo}`);
  }

}

export default GithubStrategy;
