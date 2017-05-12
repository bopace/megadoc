const Assets = require('./Assets');
const K = require('./constants');
const ConfigUtils = require('megadoc-config-utils');

module.exports =  function createAssets(config, compilations) {
  const assets = new Assets();
  const themeSpec = ConfigUtils.getConfigurablePair(config.theme);
  const themePlugin = themeSpec ? require(themeSpec.name) : {
    assets: null,
    pluginScripts: null,
    styleOverrides: null,
    styleSheets: null,
  };

  const {
    staticAssets: pluginStaticAssets,
    styleSheets: pluginStyleSheets,
    scripts: pluginScripts,
  } = compilations.map(x => x.processor.serializerOptions.html || {}).reduce(function(map, options) {
    if (options.pluginScripts) {
      options.pluginScripts.forEach(x => map.scripts.push(x));
    }

    if (options.styleSheets) {
      options.styleSheets.forEach(x => map.styleSheets.push(x));
    }

    if (options.assets) {
      options.staticAssets.forEach(x => map.staticAssets.push(x));
    }

    return map;
  }, {
    staticAssets: [],
    styleSheets: [],
    scripts: [],
  })

  const staticAssets = pluginStaticAssets.concat(config.assets).concat(themePlugin.assets);
  const styleSheets = [ K.CORE_STYLE_ENTRY ]
    .concat(pluginStyleSheets)
    .concat(themePlugin.styleSheets)
    .concat([
      config.styleSheet,
      config.stylesheet,
    ])
  ;

  const scripts = pluginScripts.concat(themePlugin.pluginScripts);
  const styleOverrides = createStyleOverrides(config, themePlugin);

  // we want the order of inclusion/initialization to be:
  //
  // 1. core
  // 2. plugins
  // 3. theme plugins
  // 4. user config
  assets.addStyleOverrides(styleOverrides);
  staticAssets.filter(isTruthy).forEach(x => { assets.add(x); });
  styleSheets.filter(isTruthy).forEach(x => { assets.addStyleSheet(x); });
  scripts.filter(isTruthy).forEach(x => { assets.addPluginScript(x); });

  return assets;
}

function createStyleOverrides(config, themePlugin) {
  const styleOverrides = {};

  if (themePlugin && themePlugin.styleOverrides) {
    Object.assign(styleOverrides, themePlugin.styleOverrides);
  }

  if (config.styleOverrides) {
    Object.assign(styleOverrides, config.styleOverrides);
  }

  return styleOverrides;
}

function isTruthy(x) {
  return !!x;
}