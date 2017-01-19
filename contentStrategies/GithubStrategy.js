import rp from 'request-promise';

function buildOptions(url, path, ish) {

  return {
    uri: `https://raw.githubusercontent.com${url}/${ish}/${path}`,
  };
}

class GithubStrategy {
  constructor(owner, repo) {
    if(!repo) {
      const found = owner.match(/git(?:\+https?|ssh)?:\/\/github.com\/([^/]+)\/([^/]+).git/);
      if(found) {
        this.url = `/${found[1]}/${found[2]}`;
      } else {
        throw `Unrecognized repo URL: ${repo}`;
      }
    } else {
      this.url = `/${owner}/${repo}/`;
    }
  }

  getFile(path, ish) {
    const options = buildOptions(this.url, path, ish);
    return rp.get(options);
  }

  getJSON(path, ish) {
    return this.getFile(path, ish).then(file => JSON.parse(file));
  }

}

export default GithubStrategy;