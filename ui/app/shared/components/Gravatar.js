var React = require('react');
var md5 = require('md5');

var Gravatar = React.createClass({
  propTypes: {
    email: React.PropTypes.string.isRequired,
    https: React.PropTypes.bool,
    size: React.PropTypes.number
  },

  getDefaultProps: function() {
    return {
      size: 48,
      https: false
    };
  },

  render: function() {
    const { props } = this;
    const href = props.https ?
      'https://secure.gravatar.com/avatar/' :
      'http://www.gravatar.com/avatar/'
    ;

    const query = `?s=${props.size}`;

    return (
      <img
        alt={props.title}
        title={props.title}
        src={href + md5(props.email) + query}
        className="gravatar"
        width={props.size}
        height={props.size}
      />
    );
  }
});

module.exports = Gravatar;