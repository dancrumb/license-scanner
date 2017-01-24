class PromiseProtector {
  constructor() {
    this.unhandledPromises = [];
    process.on('unhandledRejection', (reason, promise) => {
      console.log('Unhandled');
      this.unhandledPromises.push(promise);
    });
    process.on('rejectionHandled', (promise) => {
      console.log('Handled');
      const pIndex = promise.indexOf(promise);
      this.unhandledPromises.splice(pIndex, 1);
    });
  }

  getUnhandledPromises() {
    return this.unhandledPromises.slice();
  }

  hasUnhandledPromises() {
    return this.unhandledPromises.length > 0;
  }
}

export default new PromiseProtector();
