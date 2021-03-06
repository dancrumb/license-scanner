import BitbucketStrategy from '../contentStrategies/BitbucketStrategy';
import DependencyStrategy from './DependencyStrategy';

const URL_DECOMPOSER = /^([^:]+):\/\/(?:(.*)@)?([^/:]*)(?::(\d*))?\/([^/]*)\/([^.]*).git(?:#(.*))?$/;

class PrivateStrategy extends DependencyStrategy {
  constructor(packageName, url) {
    super(packageName, '0.0.0');
    this.packageName = packageName;
    this.license = Promise.resolve({
      raw: 'UNLICENSED',
      corrected: 'UNLICENSED',
      private: true,
    });

    if (URL_DECOMPOSER.test(url)) {
      const [, protocol, /* user */, hostname, /* port */, project, repo, ish] =
        url.match(URL_DECOMPOSER);

      this.semVer = ish || '0.0.0';
      this.repo = `${protocol}://${hostname}`;

      this.contentStrategy = new BitbucketStrategy(project, repo);
    } else {
      this.repo = url;
    }
  }

  getName() {
    return this.packageName;
  }

  getSemver() {
    return this.semVer;
  }

  getLicense() {
    return this.license;
  }

  getRepo() {
    return this.repo;
  }

}

export default PrivateStrategy;
