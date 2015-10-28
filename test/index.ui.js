const chai = require('chai');
const sinon = require('sinon');

window.CONFIG = {
  pluginConfigs: {}
};

require('../ui');

sinon.assert.expose(chai.assert, { prefix: "" });

const CoreUITests = require.context('../ui', true, /.test.js$/);
const CJSPluginTests = require.context('../plugins/cjs/ui', true, /.test.js$/);
const MarkdownPluginTests = require.context('../plugins/markdown/ui', true, /.test.js$/);
const YARDAPIPluginTests = require.context('../plugins/yard-api/ui', true, /.test.js$/);
const GitPluginTests = require.context('../plugins/git/ui', true, /.test.js$/);

CoreUITests.keys().forEach(CoreUITests);
CJSPluginTests.keys().forEach(CJSPluginTests);
MarkdownPluginTests.keys().forEach(MarkdownPluginTests);
YARDAPIPluginTests.keys().forEach(YARDAPIPluginTests);
GitPluginTests.keys().forEach(GitPluginTests);

it('gives us something', function() {
  chai.assert.ok(true);
});