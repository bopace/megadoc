var React = require("react");
var Router = require("react-router");
var RouteActions = require("actions/RouteActions");
var Banner = require('components/Banner');
var Storage = require('core/Storage');
var ColorSchemeManager = require('core/ColorSchemeManager');
var { APP_DOM_ELEMENT_ID } = require('constants');
var classSet = require('utils/classSet');

var { RouteHandler } = Router;

var Root = React.createClass({
  mixins: [ Router.Navigation, Router.State ],

  propTypes: {
    onStart: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      query: {},
      params: {}
    };
  },

  componentDidMount: function() {
    RouteActions.assignDelegate(this);
    ColorSchemeManager.load();

    if (this.props.onStart) {
      this.props.onStart(() => {
        this.forceUpdate();
      });
    }

    Storage.on('change', () => { console.log('storage changed, reloading'); this.reload(); });
  },

  componentWillUnmount: function() {
    Storage.off('change', this.reload);
    RouteActions.assignDelegate(undefined);
  },

  render() {
    var className = classSet({
      'root': true,
      'root--with-collapsed-banner': this.isBannerCollapsed()
    });

    return (
      <div className={className} id={APP_DOM_ELEMENT_ID}>
        <Banner collapsed={this.isBannerCollapsed()} onToggle={this.toggleBanner} />

        <div className="root__screen">
          <RouteHandler onChange={this.reload} {...this.props} />
        </div>
      </div>
    );
  },

  reload: function() {
    this.forceUpdate();
  },

  isBannerCollapsed() {
    return !!Storage.get('bannerCollapsed');
  },

  toggleBanner() {
    console.log('Collapsing banner:', !this.isBannerCollapsed());

    Storage.set('bannerCollapsed', !this.isBannerCollapsed());
  }
});

module.exports = Root;