import plan from 'fallback-plan';
import TextParser from '../parsers/TextParser';
import PackageParser from '../parsers/PackageParser';

const SOURCES_INFO = [
  {
    path: 'package.json',
    parser: PackageParser,
  },
  {
    path: 'LICENSE.md',
    parser: TextParser,
  },
  {
    path: 'LICENSE',
    parser: TextParser,
  },
  {
    path: 'README.md',
    parser: TextParser,
  },
  {
    path: 'README',
    parser: TextParser,
  },
  {
    path: 'readme.md',
    parser: TextParser,
  },
];


class DependencyStrategy {
  constructor(packageName, semVer) {
    this.packageName = packageName;
    this.semVer = semVer;
  }

  static pullLicenseInfo(contentStrategy) {
    const sources = SOURCES_INFO.map(source => () =>
      contentStrategy.getFile(source.path, 'master')
        .then(packageFile => source.parser.parse(packageFile))
        .then(licenseInfo => Object.assign(licenseInfo, { source: `Inferred from ${source.path}.` })));

    return plan.fallback(sources);
  }
}

export default DependencyStrategy;
