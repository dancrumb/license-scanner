import _ from 'lodash';
import Promise from 'bluebird';
import gemfile from 'gemfile';

import ContentStrategyFactory from './src/contentStrategies/ContentStrategyFactory';
import DependencyStrategyFactory from './src/dependencyStrategies/DependencyStrategyFactory';

import promiseProtector from './PromiseProtector';

const targets = require('./targets.json');


const csFactory = new ContentStrategyFactory([
  {
    pattern: /stash.jellyvision.com/,
    strategy: 'bitbucket',
  },
]);

const dsFactory = new DependencyStrategyFactory([
  {
    pattern: /stash.jellyvision.com/,
    strategy: 'private',
  },
], targets.scopes);

function getLicenseFromRepo(dependencyStrategy) {
  return dependencyStrategy.getRepo().then((repo) => {
    if (!repo) {
      return {
        raw: 'UNLICENSED',
        corrected: 'UNLICENSED',
      };
    }

    if (repo.type === 'git') {
      const GithubStrategy = ContentStrategyFactory.getContentStrategyByType('github');
      const licenseStrategy = new GithubStrategy(repo.url);
      return dependencyStrategy.constructor.pullLicenseInfo(licenseStrategy);
    }

    throw new Error(`Unknown repo type: ${repo.type}`);
  });
}

const CONVERTERS = [
  {
    pattern: /package.json/,
    dependencies: file => JSON.parse(file).dependencies,
    normalizer: deps => deps,
  },
  {
    pattern: /bower.json/,
    dependencies: file => JSON.parse(file).dependencies,
    normalizer: deps => deps,
  },
  {
    pattern: /Gemfile.lock/,
    dependencies: file => gemfile.interpret(file).DEPENDENCIES,
    normalizer: deps => Object.keys(deps).reduce((details, name) => {
      // eslint-disable-next-line no-param-reassign
      details[name] = deps[name].version;
      return details;
    }, {}),
  },
];

function getLicenseViaStrategy(strategy) {
  return strategy.getLicense()
    .catch((e) => {
      console.error(`ERROR: ${e.message}`);
    })
    .then((license) => {
      if (license.raw === '') {
        return getLicenseFromRepo(strategy);
      }
      return license;
    })
    .catch((e) => {
      console.error(`ERROR: ${e.message}`);
    });
}

function processFile(strategy, repo, path) {
  return strategy.getFile(path, repo.commit || repo.branch)
    .then((file) => {
      const converter = CONVERTERS.find(option => option.pattern.test(path));
      return converter.normalizer(converter.dependencies(file));
    })
    .then((dependencies) => {
      const strategies = _.map(dependencies,
        (semVersion, packageName) => {
          const DepStrategy = dsFactory.getDependencyStrategy(path, packageName, semVersion);

          return new DepStrategy(packageName, semVersion);
        });

      Promise.all(strategies.map(dependencyStrategy =>
        getLicenseViaStrategy(dependencyStrategy)
          .then(license => ({
            product: repo.name,
            name: dependencyStrategy.getName(),
            semver: dependencyStrategy.getSemver(),
            license,
          }))));
    });
}

const defaultRepoInfo = targets.defaultRepoInfo;

Promise.all(
  targets.repos
    .filter(r => !r.skip)
    .map((targetRepo) => {
      console.log(targetRepo);
      const repo = Object.assign({}, defaultRepoInfo, targetRepo);
      const ConStrategy = csFactory.getContentStrategyByUrl(repo.hostname);
      const strategy = new ConStrategy(repo.project, repo.repo);
      return Promise.all(repo.paths.map(path => processFile(strategy, repo, path)
        .catch((e) => {
          console.error(`ERROR: ${e}`);
        }).then((licenses) => {
          console.log(licenses);
        })));
    }))
  .then(() => {
    setTimeout(() => {
      console.log('Checking For Promises');
      if (promiseProtector.hasUnhandledPromises()) {
        console.error('Unhandled Promises');
        promiseProtector.getUnhandledPromises().forEach((uP) => {
          console.error(uP);
        });
      }
      console.log('Done Checking');
    }, 0);
  });

