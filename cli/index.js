#!/usr/bin/env node

var program = require('commander');
var fs = require('fs-extra');
var path = require('path');
var deep = require('deep-get-set');
var pkg = require('../package');
var tinydoc = require('..');
var Logger = require('../lib/Logger');
var console = new Logger('tinydoc-cli');
var config = {};
var tiny, configFilePath;

function collect(val, set) {
  set.push(val);
  return set;
}

program
  .version(pkg.version)
  .option('--config [PATH]', 'path to tinydoc config file (defaults to tinydoc.conf.js)')
  .option('--no-scan', 'Skip the scanning phase.')
  .option('--no-write', 'Do not write any assets.')
  .option('--no-index', 'Do not index documentation entities (for linking.)')
  .option('--override <KEY=VALUE>', 'Override a config item.', collect, [])
  .option('--plugin <NAME>', 'Override the active plugin list.', collect, [])
  .option('--dump-config')
  .option('--log-level [LEVEL]', 'Logger level. Valid values: "debug", "info", "log", "warn", or "error"')
  .option('-v, --verbose', 'Shortcut for --log-level="info"')
  .option('-d, --debug', 'Shortcut for --log-level="debug"')
  .option('--stats', 'Show scanner-related statistics.')
  .parse(process.argv)
;

configFilePath = program.config || 'tinydoc.conf.js';

if (fs.existsSync(configFilePath)) {
  config = require(path.resolve(configFilePath));
  config.assetRoot = config.assetRoot || path.resolve(path.dirname(configFilePath));
}
else {
  throw new Error("You must specify a config file using --config.");
}

if (!config.gitRepository) {
  config.gitRepository = path.resolve(config.assetRoot, '.git');
}

if (program.dumpConfig) {
  console.log('Config:\n', config);
}

if (program.verbose) {
  Logger.setVerbose(true);
}

if (program.debug) {
  Logger.setDebug(true);
}

if (program.logLevel) {
  Logger.setLevel(program.logLevel);
}

program.override.forEach(function(override) {
  var fragments = override.split(/\s*=\s*/);
  var key = fragments[0];
  var value = JSON.parse(fragments[1]);

  deep(config, key, value);

  console.log('Overridden "%s" with "%s"', key, value);
});

if (program.plugin.length > 0) {
  console.log('Plugins:', JSON.stringify(program.plugin));

  var activePlugins = config.plugins.filter(function(plugin) {
    return program.plugin.indexOf(plugin.name) > -1;
  });

  if (activePlugins.length !== config.plugins.length) {
    console.log('%d plugins were excluded.', config.plugins.length - activePlugins.length);
    config.plugins = activePlugins;
  }
}

tiny = tinydoc(config, {
  scan: program.scan !== false,
  write: program.write !== false,
  index: program.index !== false
});

tiny.run(function(err) {
  if (err) {
    console.error(Array(80 - 'tinydoc-cli'.length).join('*'));
    console.error('An error occurred during compilation. Error details below.');
    console.error(err.stack ? err.stack : err);
    console.error(Array(80 - 'tinydoc-cli'.length).join('*'));

    throw err;
  }

  if (program.stats === true) {
    console.log('Generating stats...')

    tiny.generateStats(function(statsErr, stats) {
      if (statsErr) {
        console.error('Unable to generate stats:');
        console.error(statsErr.stack ? statsErr.stack : statsErr);
        return;
      }

      console.raw.log(JSON.stringify(stats, null, 2));
      console.log('done!');
    });
  }
  else {
    console.log('done!');
  }
});