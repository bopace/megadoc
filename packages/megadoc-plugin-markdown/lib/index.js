var path = require('path');
var scan = require('./scan');
var assign = require('lodash').assign;
var defaults = require('./config');
var b = require('megadoc-corpus').Types.builders;

function MarkdownPlugin(userConfig) {
  var config = assign({}, defaults, userConfig);

  return {
    id: config.id,
    name: 'megadoc-plugin-markdown',

    run: function(compiler) {
      var database;

      compiler.on('scan', function(done) {
        scan(config, compiler.utils, function(err, documents) {
          if (err) {
            return done(err);
          }

          database = b.namespace({
            id: config.id,
            name: 'megadoc-plugin-markdown',
            title: config.title,
            meta: {
              // TODO: stop switching against null in CorpusVisitor - it's stupid
              href: config.baseURL ? config.baseURL : undefined,

              defaultLayouts: [
                // index pages, no sidebar, only content panel
                {
                  match: { by: 'type', on: [ 'Document', 'DocumentEntity' ] },
                  regions: [
                    {
                      name: 'Layout::Content',
                      options: { framed: true },
                      outlets: [
                        { name: 'Markdown::Document' },
                        { name: 'Layout::Content' },
                      ]
                    },
                    {
                      name: 'Layout::Sidebar',
                      outlets: [
                        { name: 'Markdown::Browser' },
                        { name: 'Layout::Sidebar' }
                      ]
                    }
                  ]
                },

                // within our namespace, we'll show the sidebar:
                {
                  match: { by: 'type', on: [ 'Namespace' ] },
                  regions: [
                    {
                      name: 'Layout::Sidebar',
                      outlets: [{ name: 'Markdown::Browser' }]
                    }
                  ]
                }
              ]
            },
            documents: documents.map(function(doc) {
              // omg omg, we're rendering everything twice now
              var compiled = compiler.renderer.withTOC(doc.source);

              // TODO: b.markdownDocument
              return b.document({
                id: doc.id,
                title: doc.plainTitle,
                summary: doc.summary,
                filePath: doc.filePath,
                properties: doc,
                entities: compiled.toc.map(function(section) {
                  return b.documentEntity({
                    id: section.scopedId,
                    title: section.text,
                    properties: section,
                    meta: {
                      indexDisplayName: Array(section.level * 2).join(' ') + section.text,
                      anchor: section.scopedId
                    }
                  })
                })
              })
            })
          });

          compiler.corpus.add(database);

          done();
        });
      });

      compiler.on('render', function(md, linkify, done) {
        database.documents.forEach(function(documentNode) {
          var doc = documentNode.properties;
          var compiled = md.withTOC(linkify({
            text: doc.source,
            contextNode: documentNode
          }), {
            baseURL: documentNode.meta.href,
            sanitize: config.sanitize !== false,
          });

          doc.source = compiled.html;
          doc.sections = compiled.toc;
        });

        done();
      });

      compiler.on('write', function(done) {
        var runtimeConfig = config;

        compiler.assets.addStyleSheet(
          path.resolve(__dirname, '..', 'ui', 'css', 'index.less')
        );

        compiler.assets.addPluginScript(
          path.resolve(__dirname, '..', 'dist', 'megadoc-plugin-markdown.js')
        );

        compiler.assets.addPluginRuntimeConfig('megadoc-plugin-markdown', runtimeConfig);

        done();
      });

      compiler.on('generateStats', function(stats, done) {
        stats['megadoc-plugin-markdown:' + config.id] = {
          count: database.documents.length
        };

        done();
      });
    }
  };
}

module.exports = MarkdownPlugin;