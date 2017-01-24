import NPMStrategy from './NPMStrategy';
import BowerStrategy from './BowerStrategy';
import GithubStrategy from './GithubStrategy';
import PrivateStrategy from './PrivateStrategy';
import RubyGemsStrategy from './RubyGemsStrategy';

const SCOPED_PACKAGE = /^@([^/]*)\/(.*)/;

const mapping = {
  github: GithubStrategy,
  npm: NPMStrategy,
  private: PrivateStrategy,
  bower: BowerStrategy,
};

function getStrategyFromOptions(version, options) {
  const matchedOption = options.find(option => option.pattern.test(version));
  if (matchedOption) {
    if (typeof matchedOption.strategy === 'string') {
      return mapping[matchedOption.strategy];
    }

    return matchedOption.strategy;
  }

  return undefined;
}

class DependencyStrategyFactory {
  constructor(options = [], scopes = {}) {
    this.options = options.concat(
      {
        pattern: /^github:/,
        strategy: 'github',
      }, {
        pattern: /github.com/,
        strategy: 'github',
      });
    this.scopes = scopes;
  }

  getDependencyStrategy(source, packageName, versionString) {
    let strategy = getStrategyFromOptions(versionString, this.options);

    if (!strategy && SCOPED_PACKAGE.test(packageName)) {
      const [, scope/* , name */] = packageName.match(SCOPED_PACKAGE);
      const scopeDetails = this.scopes[scope];

      if (scopeDetails) {
        strategy = getStrategyFromOptions(scopeDetails.hostname, this.options);
      }
    }

    if (strategy) {
      return strategy;
    }

    if (/Gemfile/.test(source)) {
      return RubyGemsStrategy;
    }

    if (/bower.json/.test(source)) {
      return BowerStrategy;
    }

    return NPMStrategy;
  }

  static getDependencyStrategyByType(type) {
    if (mapping[type]) {
      return mapping[type];
    }

    throw new Error(`No strategy found for ${type}`);
  }

}

export default DependencyStrategyFactory;
