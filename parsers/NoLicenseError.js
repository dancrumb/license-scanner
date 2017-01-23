class NoLicenseError {
  constructor(message) {
    this.name = 'MyError';
    this.message = message;
    this.stack = new Error().stack; // Optional
  }
}
NoLicenseError.prototype = Object.create(Error.prototype);

export default NoLicenseError;
