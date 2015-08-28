var fs = require('fs');
var recast = require('recast');
var Utils = require('./Utils');
var Doc = require('./Doc');
var Docstring = require('./Docstring');
var Registry = require('./Registry');
var PostProcessor = require('./PostProcessor');
var NodeAnalyzer = require('./NodeAnalyzer');
var WeakSet = require('weakset');

var Logger = require('../../../lib/Logger');
var console = Logger('cjs');

var n = recast.types.namedTypes;

function Parser() {
  this.registry = new Registry();

  // @type {WeakSet<n.CommentNode>}
  //
  // This is necessary to track the comment nodes we visited because we might
  // "force" a traversal of comments in the case of expression statements (so
  // that the comments are parsed before actual module definitions)
  //
  // If we don't do this, we need to make multiple passes over the AST so meh.
  this.visitedComments = new WeakSet();
}

var Ppt = Parser.prototype;

Ppt.parseFile = function(filePath, config, commonPrefix) {
  try {
    return this.parseString(
      fs.readFileSync(filePath, 'utf-8'),
      config,
      filePath.replace(commonPrefix, '')
    );
  }
  catch(e) {
    console.error('Failed to parse ' + filePath);
    throw e;
  }
};

Ppt.parseString = function(str, config, filePath) {
  if (str.length > 0) {
    this.ast = recast.parse(str);
    return this.walk(this.ast, filePath, config);
  }
  else {
    return [];
  }
};

Ppt.walk = function(ast, filePath, config) {
  var parser = this;

  console.debug('\nParsing: %s', filePath);
  console.debug(Array(80).join('-'));

  recast.visit(ast, {
    visitComment: function(path) {
      if (parser.visitedComments.has(path)) {
        // console.log('Comment walker: already seen this node, ignoring.');
        return false;
      }

      parser.visitedComments.add(path);

      var comment = path.value.value;
      var contextNode = path.node;

      if (path.value.leading && comment[0] === '*') {
        // console.log('Found a possibly JSDoc comment:', comment);

        var docstring = new Docstring('/*' + comment + '*/', filePath);

        if (docstring.isInternal()) {
          return false;
        }

        var nodeInfo = NodeAnalyzer.analyze(contextNode, path, filePath, config);

        if (docstring.doesLend()) {
          parser.registry.trackLend(docstring.getLentTo(), path);
        }

        var doc = new Doc(filePath, docstring, nodeInfo);

        if (doc.id) {
          if (doc.isModule()) {
            console.debug('\tFound a module "%s" (source: %s)', doc.id, nodeInfo.fileLoc);
            parser.registry.addModuleDoc(doc, path);
          }
          else {
            parser.registry.addEntityDoc(doc, path);

            console.debug('\tFound an entity "%s" belonging to "%s" (source: %s)',
              doc.id,
              doc.getReceiver(),
              nodeInfo.fileLoc
            );
          }
        }
      }

      this.traverse(path);
    },

    visitExpressionStatement: function(path) {
      var node = path.node;
      var doc, name;

      if (node.comments) {
        this.visit(path.get('comments'));
      }

      if (n.AssignmentExpression.check(node.expression)) {
        var expr = node.expression;

        // module.exports = Something;
        if (Utils.isModuleExports(expr)) {
          name = Utils.getVariableNameFromModuleExports(expr);

          if (!name && config.inferModuleIdFromFileName) {
            name = Utils.getVariableNameFromFilePath(filePath);
          }

          if (name) {
            doc = parser.registry.get(name);

            if (doc) {
              doc.markAsExported();
              // assert(doc.$path);
              // assert(doc.$path === Utils.findNearestPathWithComments(doc.$path))
              parser.registry.trackModuleDocAtPath(doc, doc.$path);
              // parser.registry.docPaths.set(doc.$path, doc);
            }
          }
          else {
            console.warn(
              'Unable to identify exported module id. ' +
              'This probably means you are using an unnamed `module.exports`.' +
              ' (source: %s)',
              Utils.dumpLocation(expr, filePath)
            );

            console.debug('Offending code block:\n%s', recast.print(expr).code);
          }
        }
      }

      this.traverse(path);
    },
  });
};

Ppt.postProcess = function() {
  PostProcessor.run(this.registry);
};

Ppt.toJSON = function() {
  return this.registry.docs.map(function(doc) {
    return doc.toJSON();
  });
};

module.exports = Parser;