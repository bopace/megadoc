var React = require('react');
var TagGroup = require('./Tags/TagGroup');
var TypeDefTagGroup = require('./Tags/TypeDefTagGroup');
var ExampleTag = require('./Tags/ExampleTag');
var ParamTag = require('./Tags/ParamTag');
var SeeTag = require('./Tags/SeeTag');
var ThrowsTag = require('./Tags/ThrowsTag');
var ReturnTag = require('./Tags/ReturnTag');
var CallbackTag = require('./Tags/CallbackTag');
var TabularTagGroup = require('./TabularTagGroup');
var { where } = require('lodash');

const HANDLED_TAGS = [
  'alias',
  'async',
  'callback',
  'class',
  'constructor',
  'deprecated',
  'example',
  'extends',
  'memberOf',
  'method',
  'module',
  'name',
  'namespace',
  'param',
  'preserveOrder',
  'private',
  'property',
  'protected',
  'return',
  'see',
  'static',
  'throws',
  'type',
  'typedef'
];

var DocTags = React.createClass({
  displayName: 'DocTags',

  propTypes: {
    config: React.PropTypes.object.isRequired,
    tags: React.PropTypes.array,
    callbacks: React.PropTypes.array,
    withExamples: React.PropTypes.bool,
    withAdditionalResources: React.PropTypes.bool,
  },

  getDefaultProps() {
    return {
      tags: [],
      callbacks: [],
      withExamples: true,
      withAdditionalResources: true
    };
  },

  // shouldComponentUpdate: function(nextProps) {
  //   return this.props.tags !== nextProps.tags;
  // },

  render() {
    var paramTags = where(this.props.tags, { type: 'param' });
    var returnTags = where(this.props.tags, { type: 'return' });
    var unhandledTags = this.props.tags.filter(function(tag) {
      return HANDLED_TAGS.indexOf(tag.type) === -1;
    });
    const { config } = this.props;

    return (
      <div className="doc-entity__tags">
        <TabularTagGroup
          alwaysGroup
          tagName="div"
          tags={paramTags}
          renderer={ParamTag}
          hideIfEmpty={config.hideBlankParameters}
        >
          Parameters ({paramTags.length})
        </TabularTagGroup>

        <TabularTagGroup
          alwaysGroup
          tagName="div"
          tags={returnTags}
          tagType="return"
          renderer={ReturnTag}
          hideIfEmpty={config.hideBlankReturns}
        >
          {returnTags.length > 1 ? 'Return Values' : 'Return Value'}
        </TabularTagGroup>

        {this.props.withExamples && (
          <TagGroup alwaysGroup tags={this.props.tags} tagType="example" renderer={ExampleTag} tagName="ul">
            Examples
          </TagGroup>
        )}

        <TagGroup alwaysGroup tagName="ul" tags={this.props.tags} tagType="throws" renderer={ThrowsTag}>
          <span className="type-attention">Exceptions</span>
        </TagGroup>

        <TypeDefTagGroup alwaysGroup tagName="ul" documents={this.props.callbacks} renderer={CallbackTag}>
          Callback Definitions
        </TypeDefTagGroup>

        {this.props.withAdditionalResources && (
          <TagGroup alwaysGroup tags={this.props.tags} tagType="see" renderer={SeeTag} tagName="ul">
            Suggested Reading
          </TagGroup>
        )}

        {unhandledTags.length > 0 && (
          unhandledTags.map(this.renderTagString)
        )}
      </div>
    );
  },

  renderTagString(tag) {
    return (
      <div key={tag.string} className="type-attention">
        <pre>{"Unknown tag:\n" + JSON.stringify(tag, null, 2)}</pre>
      </div>
    );
  }
});

module.exports = DocTags;