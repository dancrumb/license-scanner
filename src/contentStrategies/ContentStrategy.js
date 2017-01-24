

class ContentStrategy {
  getJSON(path, ish) {
    return this.getFile(path, ish).then(file => JSON.parse(file));
  }
}

export default ContentStrategy;
