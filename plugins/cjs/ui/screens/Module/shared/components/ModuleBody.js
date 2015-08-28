const React = require("react");
const Doc = require('components/Doc');
const MarkdownText = require('components/MarkdownText');
const SeeTag = require('components/Tags/SeeTag');
const DocGroup = require('components/DocGroup');
const PropertyTag = require('components/Tags/PropertyTag');
const { findWhere, where } = require("lodash");
const ExampleTag = require('components/Tags/ExampleTag');
const orderAwareSort = require('utils/orderAwareSort');
const DocClassifier = require('core/DocClassifier');
const K = require('constants');
const SectionJumperMixin = require('mixins/SectionJumperMixin');

const ModuleBody = React.createClass({
  mixins: [
    SectionJumperMixin(function() {
      const id = this.props.focusedEntity;

      if (id) {
        const item = this.refs[this.props.focusedEntity];

        if (item) {
          return item;
        }
        else {
          console.warn('waaah, unable to find entity to jump to:', id);
        }
      }
    })
  ],

  propTypes: {
    focusedEntity: React.PropTypes.string,
    doc: React.PropTypes.object,
    moduleDocs: React.PropTypes.arrayOf(React.PropTypes.object),
  },

  getDefaultProps: function() {
    return {
      focusedEntity: null
    };
  },

  render() {
    const { doc, moduleDocs } = this.props;

    return (
      <div>
        <MarkdownText>{doc.description}</MarkdownText>

        {doc.renderableType === K.TYPE_FACTORY && (
          this.renderConstructor(doc, "Instance Constructor")
        )}

        {doc.renderableType === K.TYPE_FUNCTION ? (
          this.renderConstructor(doc, "Signature")
        ) : (
          null
        )}

        {this.renderExamples(doc)}
        {this.renderAdditionalResources(doc)}
        {this.renderStaticMethods(doc, moduleDocs)}
        {this.renderProperties(doc, moduleDocs)}
        {this.renderMethods(doc, moduleDocs)}
      </div>
    );
  },

  renderConstructor(doc, title) {
    return (
      <div>
        <h2 className="doc-group__header">{title}</h2>

        <Doc
          withDescription={false}
          withExamples={false}
          withAdditionalResources={false}
          collapsible={false}
          doc={doc}
        />
      </div>
    );
  },

  renderExamples(doc) {
    const tags = where(doc.tags, { type: 'example' });

    if (!tags.length) {
      return null;
    }

    return (
      <DocGroup label="Examples">
        {tags.map(function(tag) {
          return (
            <ExampleTag key={tag.string} string={tag.string} />
          );
        })}
      </DocGroup>
    );
  },

  renderAdditionalResources(doc) {
    const tags = where(doc.tags, { type: 'see' });

    if (!tags.length) {
      return null;
    }

    return (
      <DocGroup label="Additional resources" className="class-view__sees">
        {tags.map(function(tag) {
          return (
            <SeeTag key={tag.string} string={tag.string} />
          );
        })}
      </DocGroup>
    );
  },

  renderProperties(doc, moduleDocs) {
    const propertyDocs = orderAwareSort(
      doc,
      moduleDocs.filter(function(entityDoc) {
        return where(entityDoc.tags, { type: 'property' }).length > 0;
      }),
      'id'
    );

    if (!propertyDocs.length) {
      return null;
    }

    return (
      <DocGroup label="Properties" tagName="ul">
        {propertyDocs.map(function(entityDoc) {
          const tag = findWhere(entityDoc.tags, { type: 'property' });
          const path = entityDoc.ctx.symbol + entityDoc.id;

          return (
            <PropertyTag
              key={path}
              ref={path}
              typeInfo={tag.typeInfo}
            />
          );
        })}
      </DocGroup>
    );
  },

  renderStaticMethods(doc, moduleDocs) {
    const staticMethodDocs = orderAwareSort(
      doc,
      moduleDocs.filter(DocClassifier.isStaticMethod),
      'id'
    );

    if (!staticMethodDocs.length) {
      return null;
    }

    return (
      <DocGroup label="Static Methods" tagName="ul" className="class-view__method-list">
        {staticMethodDocs.map(function(staticMethodDoc) {
          const path = staticMethodDoc.ctx.symbol + staticMethodDoc.id

          return (
            <Doc
              ref={path}
              key={path}
              initiallyCollapsed
              doc={staticMethodDoc}
            />
          );
        })}
      </DocGroup>
    );
  },

  renderMethods(doc, moduleDocs) {
    const methodDocs = orderAwareSort(
      doc,
      moduleDocs.filter(DocClassifier.isMethod),
      'id'
    );

    if (!methodDocs.length) {
      return null;
    }

    return (
      <DocGroup label="Methods" tagName="ul" className="class-view__method-list">
        {methodDocs.map(function(methodDoc) {
          const path = methodDoc.ctx.symbol + methodDoc.id;

          return (
            <Doc
              ref={path}
              key={methodDoc.id}
              initiallyCollapsed
              doc={methodDoc}
            />
          );
        })}
      </DocGroup>
    );
  }
});

module.exports = ModuleBody;