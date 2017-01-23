/**
 * Created by danrumney on 1/17/17.
 */
import rp from 'request-promise';
import rpErrors from 'request-promise/errors';

import DependencyStrategy from './DependencyStrategy';
import GithubAPIParser from '../parsers/GithubAPIParser';

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
    this.details = getPackageDetails(this.owner, this.repoName);
    this.parser = GithubAPIParser;
  }

  getRepo() {
    return Promise.resolve(`https://github.com/${this.owner}/${this.repo}`);
  }

}

export default GithubStrategy;
