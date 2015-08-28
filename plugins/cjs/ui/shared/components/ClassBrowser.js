const React = require("react");
const { Link } = require('react-router');
const Database = require('core/Database');
const classSet = require('utils/classSet');
const Storage = require('core/Storage');
const Checkbox = require('components/Checkbox');
const HotItemIndicator = require('components/HotItemIndicator');
const { findWhere, sortBy, groupBy } = require('lodash');
const isItemHot = require('utils/isItemHot');
const K = require('constants');
const PRIVATE_VISIBILITY_KEY = K.CFG_CLASS_BROWSER_SHOW_PRIVATE;
const BrowserJumperMixin = require('mixins/BrowserJumperMixin');
const orderAwareSort = require('utils/orderAwareSort');

var ClassBrowser = React.createClass({
  mixins: [
    BrowserJumperMixin(function(props) {
      if (props.activeModuleId) {
        return this.refs[props.activeModuleId];
      }
    }, 50)
  ],

  propTypes: {
    modules: React.PropTypes.array,
    activeModuleId: React.PropTypes.string,
  },

  render() {
    var modules = sortBy(this.props.modules, 'id');
    var nsClasses = groupBy(modules, 'namespace');

    var namespaces = Object.keys(nsClasses).map(function(ns) {
      return {
        name: ns === 'undefined' ? '[General]' : ns,
        sortableName: ns === 'undefined' ? '1' : '0' + ns.toLowerCase(),
        modules: nsClasses[ns]
      };
    });

    namespaces = sortBy(namespaces, 'sortableName');

    return (
      <nav className="class-browser__listing">
        {namespaces.map(this.renderNamespace)}

        <div className="class-browser__controls">
          <Checkbox
            checked={!!Storage.get(PRIVATE_VISIBILITY_KEY)}
            onChange={this.togglePrivateVisibility}
            children="Show private"
          />
        </div>
      </nav>
    );
  },

  renderNamespace(ns) {
    if (ns.modules.length === 0) {
      return null;
    }

    return (
      <div key={ns.name} className="class-browser__category">
        <h3 className="class-browser__category-name">
          {ns.name}
        </h3>

        {ns.modules.map(this.renderModule)}
      </div>
    );
  },

  renderModule(doc) {
    var { id } = doc;
    var isActive = this.props.activeModuleId === id;
    var className = classSet({
      'class-browser__entry': true,
      'class-browser__entry--active': isActive
    });

    var isPrivate = doc.isInternal || doc.isPrivate;

    if (isPrivate) {
      var showingPrivate = Storage.get(PRIVATE_VISIBILITY_KEY);

      if (!showingPrivate) {
        return null;
      }
    }

    return (
      <div key={id} className={className}>
        <Link ref={id} to="js.module" params={{ moduleId: id }} className="class-browser__entry-link">
          {doc.name}

          {isPrivate && (
            <span className="class-browser__entry-link--private"> (private)</span>
          )}

          {doc.git && isItemHot(doc.git.lastCommittedAt) && <HotItemIndicator />}
        </Link>

        {isActive && this.renderModuleEntities(doc)}
      </div>
    );
  },

  renderModuleEntities(moduleDoc) {
    var docs = Database.getModuleEntities(moduleDoc.id);

    if (!docs.length) {
      return null;
    }

    var methodDocs = docs.filter(function(doc) {
      return doc.ctx.type === K.TYPE_FUNCTION;
    });

    var propertyDocs = docs.filter(function(doc) {
      return findWhere(doc.tags, { type: 'property' });
    });

    return (
      <ul className="class-browser__methods">
        {orderAwareSort(moduleDoc, methodDocs, 'id').map((doc) => {
          return this.renderModuleEntity(moduleDoc, doc);
        })}

        {orderAwareSort(moduleDoc, propertyDocs, 'id').map((doc) => {
          return this.renderModuleEntity(moduleDoc, doc);
        })}
      </ul>
    );
  },

  renderModuleEntity(moduleDoc, doc) {
    const entityPath = (doc.ctx.symbol || '') + doc.name;

    return (
      <li key={doc.id} className="class-browser__methods-entity">
        <Link
          to="js.module"
          params={{ moduleId: moduleDoc.id }}
          query={{ entity: entityPath }}
          children={entityPath}
        />
      </li>
    );
  },

  togglePrivateVisibility() {
    Storage.set(PRIVATE_VISIBILITY_KEY, !Storage.get(PRIVATE_VISIBILITY_KEY));
  }
});

module.exports = ClassBrowser;