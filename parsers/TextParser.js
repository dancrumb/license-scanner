import infer from 'infer-license';
import NoLicenseError from './NoLicenseError';

class TextParser {
  static parse(fileContents, source = 'Unknown') {
    let license = infer.inferLicense(fileContents);

    if (license) {
      return { raw: license, corrected: license, source: `Inferred from: ${source}` };
    }

    license = infer.findLicenseLinks(fileContents);

    if (license) {
      return { raw: license, corrected: license, source: `Inferred from: ${source}` };
    }

    throw new NoLicenseError(`No license found in ${source}`);
  }

}

export default TextParser;
