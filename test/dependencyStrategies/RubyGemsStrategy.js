import nock from 'nock';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import RubyGemsStrategy from '../../src/dependencyStrategies/RubyGemsStrategy';

chai.use(chaiAsPromised);

const expect = chai.expect;

const actionmailerGems = require('../fixtures/actionmailer_gems.json');
const actionmailerVersions = require('../fixtures/actionmailer_versions.json');

nock.disableNetConnect();


describe('RubyGemsStrategy', () => {
  it('can read license information from RubyGems', () => {
    nock('https://rubygems.org')
      .get('/api/v1/gems/actionmailer.json')
      .reply(200, actionmailerGems)
      .get('/api/v1/versions/actionmailer.json')
      .reply(200, actionmailerVersions);
    const strategy = new RubyGemsStrategy('actionmailer', '5.0.0');
    return expect(strategy.getLicense()).to.eventually.deep
      .equal({ corrected: 'MIT', raw: 'MIT', source: 'RubyGems' });
  });
  it('can read repo information from RubyGems', () => {
    nock('https://rubygems.org')
      .get('/api/v1/gems/actionmailer.json')
      .reply(200, actionmailerGems)
      .get('/api/v1/versions/actionmailer.json')
      .reply(200, actionmailerVersions);
    const strategy = new RubyGemsStrategy('actionmailer', '5.0.0');
    return expect(strategy.getRepo()).to.eventually.deep
      .equal({ type: 'unknown', url: null });
  });
  it('can handle being rate limited', () => {
    nock('https://rubygems.org')
      .get('/api/v1/gems/actionmailer.json')
      .reply(429)
      .get('/api/v1/versions/actionmailer.json')
      .reply(429);

    const strategy = new RubyGemsStrategy('actionmailer', '5.0.0');
    return Promise.all([
      expect(strategy.getLicense()).to.eventually.be.rejected,
      expect(strategy.getRepo()).to.eventually.be.rejected,
    ]);
  });
  it('correctly converts RubyGems version to semver', () => {
    nock('https://rubygems.org').get(/.*/).times(4).reply(200, 'Ok');
    let strategy = new RubyGemsStrategy('foo', '5.0.0');
    expect(strategy.getSemver()).to.equal('5.0.0');
    strategy = new RubyGemsStrategy('foo', '~>5.0.0');
    expect(strategy.getSemver()).to.equal('>= 5.0.0 < 5.1.0');
    strategy = new RubyGemsStrategy('foo', '~>5');
    expect(strategy.getSemver()).to.equal('>= 5.0.0 < 6.0.0');
  });
});
