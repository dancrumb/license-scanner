import semver from 'semver';
import spdxCorrect from 'spdx-correct';
import NoLicenseError from './NoLicenseError';

class PackageParser {
  static parse(stringOrObject, version = '*') {
    let packageObject;
    try {
      packageObject = (typeof stringOrObject === 'object') ? stringOrObject :
        JSON.parse(stringOrObject);
    } catch (e) {
      throw new Error('Did not receive a valid JSON string or object');
    }

    if (packageObject.versions) {
      const availableVersions = Object.key(packageObject.versions);
      const targetVersion = semver.maxSatisfying(availableVersions, version);
      if (targetVersion) {
        const versionSpecifics = packageObject.versions[targetVersion];
        packageObject = Object.assign({}, packageObject, versionSpecifics);
      }
    }

    return PackageParser.extractSPDXLicense(packageObject);
  }

  static extractSPDXLicense(mergedDetails) {
    const license = (typeof mergedDetails.license === 'object') ? mergedDetails.license.type :
      mergedDetails.license;

    try {
      if (license) {
        return {
          raw: license,
          corrected: spdxCorrect(license),
        };
      }

      const licenses = mergedDetails.licenses;
      if (licenses) {
        return {
          raw: licenses.map(l => l.type).join(' OR '),
          corrected: licenses.map(l => l.type).map(spdxCorrect).join(' OR '),
        };
      }
    } catch (e) {
      console.error('Error trying to correct SPDX strings for:');
      console.error(mergedDetails.license);
      console.error(mergedDetails.licenses);
      throw e;
    }

    throw new NoLicenseError();
  }
}

export default PackageParser;
