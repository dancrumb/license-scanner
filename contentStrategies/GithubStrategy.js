import rp from 'request-promise';
import rpErrors from 'request-promise/errors';

function buildOptions(url, path, ish) {
  return {
    uri: `https://raw.githubusercontent.com${url}/${ish}/${path}`,
  };
}

class GithubStrategy {
  constructor(owner, repo) {
    if (!repo) {
      const found = owner.match(/git(?:\+https?|ssh)?:\/\/github.com\/([^/]+)\/([^/]+).git/);
      if (found) {
        this.url = `/${found[1]}/${found[2]}`;
      } else {
        throw new Error(`Unrecognized repo URL: ${repo}`);
      }
    } else {
      this.url = `/${owner}/${repo}`;
    }
  }

  getFile(path, ish) {
    const options = buildOptions(this.url, path, ish);
    return rp.get(options)
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          throw new Error(`Could not find ${options.uri}`);
        }
        throw new Error(reason);
      });
  }
}

export default GithubStrategy;
