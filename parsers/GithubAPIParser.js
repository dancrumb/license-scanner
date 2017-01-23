import TextParser from './TextParser';

const base64ToString = b64 => (new Buffer(b64, 'base64')).toString();

class GithubAPIParser {
  static parse(stringOrObject, version = '*') {
    let packageObject;
    try {
      packageObject = (typeof stringOrObject === 'object') ? stringOrObject :
        JSON.parse(stringOrObject);
    } catch (e) {
      throw new Error('Did not receive a valid JSON string or object');
    }

    if (packageObject.license.raw) {
      return GithubAPIParser.extractSPDXLicense(packageObject);
    }

    const licenseText = base64ToString(packageObject.content);
    return TextParser.parse(licenseText, 'Github API License');
  }

  static extractSPDXLicense(mergedDetails) {
    return Object.assign(mergedDetails, { source: 'Github API' });
  }
}

export default GithubAPIParser;
