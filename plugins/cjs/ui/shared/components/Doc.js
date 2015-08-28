var React = require("react");
var ellipsify = require('utils/ellipsify');
var classSet = require('utils/classSet');
var MarkdownText = require('components/MarkdownText');
var DocTags = require('components/DocTags');
var Collapsible = require('mixins/Collapsible');

function params(tags) {
  return tags.filter(function(tag){
    return tag.type === 'param' && tag.typeInfo.name.indexOf('.') === -1;
  }).map(function(param){
    return param.typeInfo.name + ':' + param.typeInfo.types.join('|');
  }).join(', ');
}

function isFunction(doc) {
  return doc.ctx.type === 'function';
}

var Doc = React.createClass({
  displayName: "Doc",

  mixins: [ Collapsible ],

  propTypes: {
    doc: React.PropTypes.object.isRequired,
    collapsible: React.PropTypes.bool,
    withExamples: React.PropTypes.bool,
    withTitle: React.PropTypes.bool,
    withDescription: React.PropTypes.bool,
    withAdditionalResources: React.PropTypes.bool,
  },

  getDefaultProps: function() {
    return {
      withTitle: true,
      withDescription: true,
      withExamples: true
    };
  },

  render() {
    var isCollapsed = this.isCollapsed();
    var className = classSet({
      'doc-entity': true,
      'collapsible': !!this.props.collapsible,
      'collapsible--collapsed': isCollapsed,
    });

    const { doc } = this.props;
    const description = doc.description;
    const summary = doc.description.split('\n\n')[0];

    return (
      <div className={className}>
        {this.props.withTitle && (
          <h4 className="doc-entity__header collapsible-header" onClick={this.toggleCollapsed}>
            {this.renderCollapser()}

            <span className="doc-entity__name">
              {doc.name}

              {isFunction(doc) && (
                <span className="doc-entity__method-params">
                  ({params(doc.tags)})
                </span>
              )}

              {doc.isConstructor && (
                <span className="doc-entity__modifier">CONSTRUCTOR</span>
              )}

              {doc.isProtected && (
                <span className="doc-entity__modifier doc-entity__protected">PROTECTED</span>
              )}

              {doc.isPrivate && (
                <span className="doc-entity__modifier doc-entity__private">PRIVATE</span>
              )}

              {doc.tags.some((t) => t.type === 'async') && (
                <span className="doc-entity__modifier doc-entity__async">ASYNC</span>
              )}
            </span>
          </h4>
        )}

        {!doc.isConstructor && this.props.withDescription && (
          <MarkdownText className="doc-entity__description">
            {isCollapsed ? (
              ellipsify(summary, 120) +
              (summary.length < 120 && description.length > summary.length ?
                '...' :
                ''
              )
            ) : description}
          </MarkdownText>
        )}

        {!isCollapsed && (
          <DocTags
            tags={doc.tags}
            withExamples={this.props.withExamples}
            withAdditionalResources={this.props.withAdditionalResources}
          />
        )}
      </div>
    );
  }
});

module.exports = Doc;