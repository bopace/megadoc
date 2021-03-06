const Subject = require('../LayoutEngine');
const { assert } = require('chai');
const { assign, omit } = require('lodash');

describe('megadoc::LayoutEngine', function() {
  describe('getRegionsForDocument', function() {
    const subject = function(params) {
      return Subject.getRegionsForDocument(omit(params, 'layouts'), params.layouts);
    };

    it('matches by url', function() {
      const layout = subject({
        pathname: '/foo',

        layouts: [{
          match: { by: 'url', on: '/foo' },
          regions: [
            {
              name: 'Core::Content',
              outlets: null
            }
          ]
        }]
      });

      assert.ok(layout);
    });

    it('matches by type', function() {
      const params = {
        pathname: '/foo',

        layouts: [{
          match: { by: 'type', on: 'DocumentEntity' },
          regions: [
            {
              name: 'Core::Content',
              outlets: null
            }
          ]
        }]
      };

      assert.notOk(subject(params));
      assert.ok(subject(assign({}, params, { documentNode: { type: 'DocumentEntity' }})));
    });

    it('matches by path', function() {
      const params = {
        pathname: '/foo',

        layouts: [{
          match: { by: 'path', on: [ 'api/Database' ] },
          regions: [
            {
              name: 'Core::Content',
              outlets: null
            }
          ]
        }]
      };

      assert.notOk(subject(assign({}, params, { documentNode: { path: 'api/foo' }})));
      assert.ok(subject(assign({}, params, { documentNode: { path: 'api/Database' }})));
    });

    it('matches by namespace UID', function() {
      const params = {
        pathname: '/foo',

        layouts: [{
          match: { by: 'namespace', on: [ 'api' ] },
          regions: [
            {
              name: 'Core::Content',
              outlets: null
            }
          ]
        }]
      };

      assert.notOk(subject(assign({}, params, { namespaceNode: { path: 'md' }})));
      assert.ok(subject(assign({}, params, { namespaceNode: { path: 'api' }})));
    });
  });
});