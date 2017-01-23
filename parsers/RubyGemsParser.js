import semver from 'semver';
import spdxCorrect from 'spdx-correct';
import NoLicenseError from './NoLicenseError';

const getLicenseType = l => ((typeof l === 'object') ? l.type : l);

class RubyGemsParser {
  static parse(stringOrObject, version = '*') {
    let packageObject;
    try {
      packageObject = (typeof stringOrObject === 'object') ? stringOrObject :
        JSON.parse(stringOrObject);
    } catch (e) {
      throw new Error('Did not receive a valid JSON string or object');
    }

    const versionInfo = packageObject.versions;
    const possibleVersions = Object.keys(versionInfo);
    if (!possibleVersions) {
      console.log(`No versions found for ${packageObject.name}`);
    }
    console.log(packageObject.name, possibleVersions, version);
    const targetVersion = semver.maxSatisfying(possibleVersions, version);
    const versionDetails = versionInfo[targetVersion];
    if (!versionDetails) {
      throw new NoLicenseError(`No details found for ${targetVersion} of ${packageObject.name}`);
    }
    const mergedDetails = Object.assign({}, packageObject, versionDetails);
    return RubyGemsParser.extractSPDXLicense(mergedDetails);
  }

  static extractSPDXLicense(mergedDetails) {
    const license = getLicenseType(mergedDetails.license);

    try {
      if (license) {
        return {
          raw: license,
          corrected: spdxCorrect(license),
        };
      }

      const licenses = mergedDetails.licenses;
      if (licenses) {
        console.log(licenses);
        return {
          raw: licenses.map(getLicenseType).join(' OR '),
          corrected: licenses.map(getLicenseType).map(spdxCorrect).join(' OR '),
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

export default RubyGemsParser;
