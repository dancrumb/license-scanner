import BitbucketStrategy from './BitbucketStrategy';
import GithubStrategy from './GithubStrategy';

const mapping = {
  github: GithubStrategy,
  bitbucket: BitbucketStrategy,
};

class ContentStrategyFactory {
  constructor(options = []) {
    this.options = options.concat(
      {
        pattern: /github\.com/,
        strategy: 'github',
      });
  }

  getContentStrategyByUrl(url) {
    const matchedOption = this.options.find(option => option.pattern.test(url));
    if (matchedOption) {
      if (typeof matchedOption.strategy === 'string') {
        return mapping[matchedOption.strategy];
      }

      return matchedOption.strategy;
    }

    throw new Error(`No strategy found for ${url}`);
  }

  static getContentStrategyByType(type) {
    if (mapping[type]) {
      return mapping[type];
    }

    throw new Error(`No strategy found for ${type}`);
  }

}

export default ContentStrategyFactory;
