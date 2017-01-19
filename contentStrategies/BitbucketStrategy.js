import rp from 'request-promise';
import rpErrors from 'request-promise/errors';

function buildOptions(url, path, ish) {
  const location = /[a-f0-9]{20,}/.test(ish) ? ish : (`refs/heads/${ish}`);

  return {
    uri: `https://stash.jellyvision.com${url}${path}`,
    qs: {
      at: location,
    },
  };
}

class BitbucketStrategy {
  constructor(project, repo) {
    this.url = `/projects/${project}/repos/${repo}/raw/`;
  }

  getFile(path, ish) {
    const options = buildOptions(this.url, path, ish);
    return rp.get(options).auth(process.env.STASH_USER, process.env.STASH_PASSWORD)
      .catch(rpErrors.StatusCodeError, (reason) => {
        if (reason.statusCode === 404) {
          console.error(`Couldn't find file at ${options.uri}`);
          throw new Error('Missing file');
        }
        console.log(`Status Code Error for ${packageName}`);
        throw new Error(reason);
      });
  }

  getJSON(path, ish) {
    return this.getFile(path, ish).then(file => JSON.parse(file));
  }

}

export default BitbucketStrategy;