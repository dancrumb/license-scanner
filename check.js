import _ from 'lodash';
import Promise from 'bluebird';
import { inferLicense } from 'infer-license';

import gemfile from 'gemfile';

import ContentStrategyFactory from './contentStrategies/ContentStrategyFactory';
import DependencyStrategyFactory from './dependencyStrategies/DependencyStrategyFactory';

import GithubStrategy from './contentStrategies/GithubStrategy';

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
      const licenseStrategy = new GithubStrategy(repo.url);
      return dependencyStrategy.pullLicenseInfo(licenseStrategy);
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

function processFile(strategy, repo, path) {
  strategy.getFile(path, repo.commit || repo.branch)
    .then((file) => {
      const converter = CONVERTERS.find(option => option.pattern.test(path));
      return converter.normalizer(converter.dependencies(file));
    })
    .then((dependencies) => {
      console.log(dependencies);
      const strategies = _.map(dependencies,
        (semVersion, packageName) => {
          const DepStrategy = dsFactory.getDependencyStrategy(path, packageName, semVersion);

          return new DepStrategy(packageName, semVersion);
        });

      Promise.all(strategies.map(dependencyStrategy => dependencyStrategy.getLicense()
        .then((license) => {
          if (license.raw === '') {
            return getLicenseFromRepo(dependencyStrategy);
          }
          return license;
        })
        .then(license => ({
          product: repo.name,
          name: dependencyStrategy.getName(),
          semver: dependencyStrategy.getSemver(),
          license,
        })))).then((licenses) => {
          console.log(licenses);
        });
    });
}

const defaultRepoInfo = targets.defaultRepoInfo;

_.forEach(targets.repos, (targetRepo) => {
  if (targetRepo.skip) {
    return;
  }
  const repo = Object.assign({}, defaultRepoInfo, targetRepo);
  console.log(repo);
  const ConStrategy = csFactory.getContentStrategyByUrl(repo.hostname);
  const strategy = new ConStrategy(repo.project, repo.repo);
  repo.paths.forEach(processFile.bind(null, strategy, repo));
});

