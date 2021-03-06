const assert = require('assert');
const TestUtils = require('../../TestUtils');
const findWhere = require('lodash').findWhere;
const K = require('../../constants');
const { stubConsoleWarn } = require('megadoc-test-utils');

describe('CJS::Parser - @lends support', function() {
  it('redirects all entities belonging to a @lends object into the specified receiver', function() {
    var docs = TestUtils.parseInline(function() {;
      // /**
      //  * Adooken.
      //  */
      // let DOMHelpers = exports;
      //
      // /**
      //  * @lends DOMHelpers
      //  */
      // var helpers = {};
      //
      // /** Locate an element inside the component. */
      // helpers.findAll = function(selector, options = {}) {
      // };
      //
      // /** Locate an element inside the component. */
      // helpers.find = function(selector, options) {
      // };
    });

    function get(id, asserts) {
      var doc = findWhere(docs, { id: id });
      assert.ok(doc);
      asserts(doc);
    }

    assert.equal(docs.length, 3);

    get('DOMHelpers', function(doc) {
      assert.equal(doc.isModule, true);
      assert.equal(doc.type, K.TYPE_OBJECT);
    });

    get('DOMHelpers.findAll', function(doc) {
      assert.equal(doc.receiver, 'DOMHelpers');
    });

    get('DOMHelpers.find', function(doc) {
      assert.equal(doc.receiver, 'DOMHelpers');
    });
  });

  it('correctly links entities defined using something like assign()', function() {
    stubConsoleWarn('No identifier was found for this document, it will be ignored!');

    var docs = TestUtils.parseInline(function() {;
      // /** @module */
      // var DragonHunter = {};
      //
      // /** @lends DragonHunter */
      // assign(DragonHunter, {
      //  /**
      //   * Adooken.
      //   */
      //   someProperty: 'a'
      // });
    });

    assert.equal(docs.length, 2);
    assert.equal(docs[1].type, K.TYPE_LITERAL);
    assert.equal(docs[1].name, 'someProperty');
    assert.equal(docs[1].receiver, 'DragonHunter');
    assert.equal(docs[1].nodeInfo.value, 'a');
  });

  it('correctly resolves a namespaced module', function() {
    stubConsoleWarn('No identifier was found for this document, it will be ignored!');

    var docs = TestUtils.parseInline(function() {;
      // /**
      //  * @namespace API
      //  * @module
      //  */
      // var DragonHunter = {};
      //
      // /** @lends DragonHunter */
      // assign(DragonHunter, {
      //  /**
      //   * Adooken.
      //   */
      //   someProperty: 'a'
      // });
    });

    assert.equal(docs.length, 2);
    assert.equal(docs[1].type, K.TYPE_LITERAL);
    assert.equal(docs[1].name, 'someProperty');
    assert.equal(docs[1].receiver, 'API.DragonHunter');
    assert.equal(docs[1].nodeInfo.value, 'a');
  });

  it('lends to a prototype', function() {
    stubConsoleWarn('No identifier was found for this document, it will be ignored!');

    var docs = TestUtils.parseInline(function() {;
      // /** @module */
      // function DragonHunter() {}
      //
      // /** @lends DragonHunter.prototype */
      // assign(DragonHunter, {
      //  /** Adooken. */
      //   someProperty: 'a',
      //
      //   /** Booyah */
      //   someMethod: function() {
      //   }
      // });
    });

    assert.equal(docs.length, 3);
    assert.equal(docs[1].name, 'someProperty');
    assert.equal(docs[1].receiver, 'DragonHunter');
    assert.equal(docs[1].nodeInfo.scope, K.SCOPE_PROTOTYPE);

    assert.equal(docs[2].name, 'someMethod');
    assert.equal(docs[2].receiver, 'DragonHunter');
    assert.equal(docs[2].nodeInfo.scope, K.SCOPE_PROTOTYPE);
  });
});
