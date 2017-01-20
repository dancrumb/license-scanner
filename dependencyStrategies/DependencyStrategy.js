import spdxCorrect from 'spdx-correct';
import { inferLicense } from 'infer-license';

class DependencyStrategy {

  pullLicenseInfo(contentStrategy) {
    return contentStrategy.getFile('LICENSE.md', 'master')
      .catch((err) => {
        if (err.statusCode === 404) {
          return contentStrategy.getFile('README.md', 'master');
        }
        throw err;
      })
      .then((fileContents) => {
        const license = inferLicense(fileContents);
        if (license) {
          return { raw: `${license}*`, corrected: license };
        }

        return { raw: 'UNLICENSED*', corrected: 'UNLICENSED' };
      });
  }

  extractSPDXLicense(mergedDetails) {
    const license = (typeof mergedDetails.license === 'object') ? mergedDetails.license.type : mergedDetails.license;
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

    return {
      raw: '',
      corrected: '',
    };
  }

}

export default DependencyStrategy;
