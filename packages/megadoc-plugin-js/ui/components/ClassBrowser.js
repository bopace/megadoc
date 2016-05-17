const React = require("react");
const Link = require('components/Link');
const classSet = require('utils/classSet');
const Storage = require('core/Storage');
const Checkbox = require('components/Checkbox');
const HotItemIndicator = require('components/HotItemIndicator');
const { findWhere, sortBy } = require('lodash');
const isItemHot = require('utils/isItemHot');
const K = require('../constants');
const PRIVATE_VISIBILITY_KEY = K.CFG_CLASS_BROWSER_SHOW_PRIVATE;
const orderAwareSort = require('../utils/orderAwareSort');
const { object, bool, } = React.PropTypes;

var ClassBrowser = React.createClass({
  propTypes: {
    withControls: bool,
    documentNode: object,
    documentEntityNode: object,
    namespaceNode: object,
  },

  getDefaultProps: function() {
    return {
      withControls: true
    };
  },

  shouldComponentUpdate: function(nextProps) {
    return (
      nextProps.documentEntityNode !== this.props.documentEntityNode ||
      nextProps.documentNode !== this.props.documentNode ||
      nextProps.namespaceNode !== this.props.namespaceNode
    );
  },

  render() {
    const rootDocuments = this.props.namespaceNode.documents;
    const genericNamespace = {
      id: '__general__',
      title: '[General]',
      documents: [],
      meta: {}
    };

    const namespaces = rootDocuments.reduce(function(list, node) {
      if (node.documents.length) {
        list.push(node);
      }
      else {
        list[0].documents.push(node);
      }

      return list;
    }, [ genericNamespace ]).sort(function(a, b) {
      if (a.id === '__general__') {
        return 1;
      }
      else {
        return a.id > b.id ? 1 : -1;
      }
    });

    const shouldDisplayName = namespaces.length > 1;

    return (
      <nav className="class-browser__listing">
        {namespaces.map(this.renderNamespace.bind(null, shouldDisplayName))}

        {this.props.withControls && (
          <div className="class-browser__controls">
            <Checkbox
              checked={!!Storage.get(PRIVATE_VISIBILITY_KEY)}
              onChange={this.togglePrivateVisibility}
              children="Show private"
            />
          </div>
        )}
      </nav>
    );
  },

  renderNamespace(shouldDisplayName, ns) {
    if (ns.documents.length === 0) {
      return null;
    }

    const hasSelfDocument = ns.id !== '__general__' && (ns.properties || megadoc.hasCustomLayoutForDocument(ns));

    return (
      <div key={ns.id} className="class-browser__category">
        {shouldDisplayName && (
          <h3 className="class-browser__category-name">
            {hasSelfDocument ? (
              <Link to={ns} children={ns.title} />
            ) : (
              ns.title
            )}
          </h3>
        )}

        {hasSelfDocument && this.props.documentNode === ns && (
          this.renderModuleEntities(ns.entities)
        )}

        {sortBy(ns.documents, 'id').map(this.renderModule)}
      </div>
    );
  },

  renderModule(docNode) {
    const doc = docNode.properties;
    const { id } = doc;
    const isActive = this.props.documentNode === docNode;
    const className = classSet({
      'class-browser__entry': true,
      'class-browser__entry--active': isActive
    });

    const isPrivate = doc.isPrivate;

    if (isPrivate && !Storage.get(PRIVATE_VISIBILITY_KEY)) {
      return null;
    }

    return (
      <div key={docNode.uid} className={className}>
        <Link ref={id} to={docNode} className="class-browser__entry-link">
          {doc.name}

          {isPrivate && (
            <span className="class-browser__entry-link--private"> (private)</span>
          )}

          {doc.git && isItemHot(doc.git.lastCommittedAt) && <HotItemIndicator />}
        </Link>

        {isActive && this.renderModuleEntities(docNode)}
      </div>
    );
  },

  renderModuleEntities(documentNode) {
    if (!documentNode.entities || !documentNode.entities.length) {
      return null;
    }

    const moduleDoc = documentNode.properties;
    const methodDocs = documentNode.entities.filter(function(x) {
      return x.properties.ctx.type === K.TYPE_FUNCTION;
    });

    const propertyDocs = documentNode.entities.filter(function(x) {
      return !!findWhere(x.properties.tags, { type: 'property' });
    });

    return (
      <ul className="class-browser__methods">
        {orderAwareSort(moduleDoc, methodDocs, 'id').map(this.renderEntity)}
        {orderAwareSort(moduleDoc, propertyDocs, 'id').map(this.renderEntity)}
      </ul>
    );
  },

  renderEntity(node) {
    return (
      <li key={node.uid} className="class-browser__methods-entity">
        <Link
          to={node}
          children={(node.properties.ctx.symbol || '') + node.properties.name}
          title={node.title}
        />
      </li>
    );
  },

  togglePrivateVisibility() {
    Storage.set(PRIVATE_VISIBILITY_KEY, !Storage.get(PRIVATE_VISIBILITY_KEY));
  }
});

module.exports = ClassBrowser;