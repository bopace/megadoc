const async = require('async');
const BlankSerializer = require('./BlankSerializer');
const composeTree = require('./composeTree');
const ConfigUtils = require('megadoc-config-utils');
const createBreakpoint = require('./utils/createBreakpoint');
const createCompilation = require('./createCompilation');
const createProfiler = require('./utils/createProfiler');
const defaults = require('./config');
const divisus = require('divisus');
const emit = require('./emit');
const fs = require('fs-extra');
const Linter = require('megadoc-linter');
const mergeTrees = require('./mergeTrees');
const os = require('os');
const parse = require('./parse');
const parseConfig = require('./parseConfig');
const path = require('path');
const purge = require('./purge');
const R = require('ramda');
const reduce = require('./reduce');
const reduceTree = require('./reduceTree');
const refine = require('./refine');
const render = require('./render');
const seal = require('./seal');
const teardown = require('./teardown');
const Service = require('./Service');
const { assocWith, mergeWith, nativeAssoc } = require('./utils');

const asyncSequence = fns => async.seq.apply(async, fns.filter(x => !!x));
const {
  BREAKPOINT_COMPILE,
  BREAKPOINT_PARSE,
  BREAKPOINT_MERGE_CHANGE_TREE,
  BREAKPOINT_REFINE,
  BREAKPOINT_REDUCE,
  BREAKPOINT_RENDER,
  BREAKPOINT_REDUCE_TREE,
  BREAKPOINT_COMPOSE_TREE,
  BREAKPOINT_RENDER_CORPUS,
  BREAKPOINT_EMIT_ASSETS,
} = require('./breakpoints');
const { BreakpointError } = createBreakpoint;
const { asyncify } = async;

/**
 * @module Compiler
 *
 * Perform the compilation.
 *
 * @param {Function} done
 *        Callback to invoke when the compilation is complete.
 *
 * @param {String|Error} done.err
 *        If present, the compilation has failed. This parameter provides some
 *        context around the failure.
 *
 * @param  {Object} runOptions
 *         A set of options to control the compilation.
 *
 * @param {Boolean} [runOptions.stats=false]
 *        Turn this on if you want to generate compile-time statistics.
 */
module.exports = function compile(userConfig, runOptions, done) {
  if (arguments.length === 2) {
    return compile(userConfig, {}, runOptions);
  }

  const profile = { benchmarks: [] };
  const defineBreakpoint = createBreakpoint(runOptions.breakpoint, runOptions.tap);
  const instrument = createProfiler({
    enabled: !!runOptions.profile,
    writeFn: x => profile.benchmarks.push(x)
  });

  const boot = asyncSequence([
    asyncify
    (
      mergeWith({ instrument })
    ),

    instrument.async('boot:parse-config')
    (
      asyncify(
        assocWith
        (
          'config'
        )
        (
          () => mergeWith(defaults, parseConfig(userConfig))
        )
      )
    ),

    instrument.async('boot:create-temp-directory')
    (
      createTempDirectory
    ),

    instrument.async('boot:create-linter')
    (
      createLinter
    ),

    instrument.async('boot:create-compilations')
    (
      asyncify
      (
        assocWith
        (
          'compilations'
        )
        (
          R.partial(createCompilations, [
            {
              optionWhitelist: [
                'assetRoot',
                'debug',
                'outputDir',
                'tmpDir',
                'verbose',
              ]
            }
          ])
        )
      )
    ),

    (state, callback) => async.parallel([

      instrument.async('boot:start-services')
      (
        R.partial(startServices, [state])
      ),

      R.curry(async.waterfall)([
        instrument.async('boot:create-serializer')
        (
          R.partial(createSerializer, [state])
        ),

        instrument.async('boot:start-serializer')
        (
          startSerializer
        ),
      ]),

      instrument.async('boot:start-cluster')
      (
        R.partial(startCluster, [state])
      ),
    ], (err, results) => {
      if (err) {
        callback(err)
      }
      else {
        callback(null, R.mergeAll([ state ].concat(R.unnest(results))))
      }
    })
  ])

  const bootCompileAndEmit = asyncSequence([
    instrument.async('boot')
    (
      boot
    ),

    instrument.async('compile')
    (
      defineBreakpoint(BREAKPOINT_COMPILE)
      (
        compileTrees
      )
    ),

    instrument.async('emit')
    (
      sealPurgeAndEmit
    ),

    instrument.async('teardown')
    (
      teardown
    )
  ])

  instrument.async('total')(bootCompileAndEmit)({
    userConfig,
    runOptions,
  }, (err, state) => {
    if (err instanceof BreakpointError) {
      done(null, err.result);
    }
    else if (err) {
      done(err);
    }
    else if (runOptions.profile) {
      done(null, R.merge({ profile }, state));
    }
    else {
      done(null, state);
    }
  });
}

function compileTrees(state, done) {
  const { runOptions, serializer, compilations, instrument } = state;
  const defineBreakpoint = createBreakpoint(runOptions.breakpoint, runOptions.tap);
  const prevCompilations = R.pathOr([], ['initialState', 'compilations'], runOptions)
  const findPrevCompilation = compilation => prevCompilations.filter(x => x.id === compilation.id)

  const scopeMessage = message => x => `${message} [${x.id}]`
  const compileTree = asyncSequence([
    instrument.async(scopeMessage('compile:parse'))
    (
      defineBreakpoint(BREAKPOINT_PARSE)
      (
        R.partial(parse, [ state.cluster, state.config.concurrency, ])
      )
    ),

    instrument.async(scopeMessage('compile:merge-change-tree'))
    (
      defineBreakpoint(BREAKPOINT_MERGE_CHANGE_TREE)
      (
        asyncify
        (
          compilation =>
          (
            R.reduce
            (
              (aggregateCompilation, prevCompilation) =>
              (
                R.merge
                (
                  aggregateCompilation
                )
                (
                  mergeTrees(prevCompilation, aggregateCompilation)
                )
              )
            )
            (
              compilation
            )
            (
              findPrevCompilation(compilation)
            )
          )
        )
      )
    ),

    instrument.async(scopeMessage('compile:refine'))
    (
      defineBreakpoint(BREAKPOINT_REFINE)
      (
        refine
      )
    ),

    instrument.async(scopeMessage('compile:reduce'))
    (
      defineBreakpoint(BREAKPOINT_REDUCE)
      (
        R.partial(reduce, [ serializer ])
      )
    ),

    instrument.async(scopeMessage('compile:render'))
    (
      defineBreakpoint(BREAKPOINT_RENDER)
      (
        R.partial(render, [ serializer.renderRoutines ])
      )
    ),

    instrument.async(scopeMessage('compile:reduce-tree'))
    (
      defineBreakpoint(BREAKPOINT_REDUCE_TREE)
      (
        reduceTree
      )
    ),

    instrument.async(scopeMessage('compile:compose-tree'))
    (
      defineBreakpoint(BREAKPOINT_COMPOSE_TREE)
      (
        asyncify
        (
          assocWith('tree', composeTree)
        )
      )
    ),
  ]);

  async.map(compilations, compileTree, function(err, withTrees) {
    if (err) {
      done(err);
    }
    else {
      done(null, nativeAssoc('compilations', withTrees, state))
    }
  });
}

function sealPurgeAndEmit(state, done) {
  const { compilations, runOptions, serializer, instrument } = state;
  const defineBreakpoint = createBreakpoint(runOptions.breakpoint, runOptions.tap);

  asyncSequence([
    instrument.async('emit:seal')
    (
      defineBreakpoint(BREAKPOINT_RENDER_CORPUS)
      (
        R.partial(seal, [ serializer ])
      )
    ),

    runOptions.purge &&
    (
      instrument.async('emit:purge')
      (
        R.partial(purge, [ serializer ])
      )
    ) || null,

    instrument.async('emit:write-assets')
    (
      defineBreakpoint(BREAKPOINT_EMIT_ASSETS)
      (
        R.partial(emit, [ serializer ])
      )
    ),
  ])(compilations, function(err, emitted) {
    if (err) {
      done(err);
    }
    else {
      done(null, Object.assign({}, state, emitted));
    }
  });
}

function createSerializer(state, done) {
  const { config } = state;
  const serializerSpec = ConfigUtils.getConfigurablePair(config.serializer);
  let serializer;

  if (!serializerSpec) {
    serializer = new BlankSerializer()
  }
  else {
    const serializerModule = require(serializerSpec.name);
    const factory = serializerModule.factory || serializerModule;

    serializer = new factory(config, serializerSpec.options);
  }

  done(null, Object.assign({}, state, { serializer }));
}

function createLinter(state, done) {
  const { config } = state;

  done(null, Object.assign({}, state, { linter: Linter.for(config) }));
}

function createCompilations({ optionWhitelist }, state) {
  const compilations = R.map
    (
      R.partial(createCompilation, [ optionWhitelist, state ])
    )
    (
      state.config.sources
    )
  ;

  return compilations;
}

function startSerializer(state, done) {
  const { serializer, compilations } = state;

  // todo: cluster
  serializer.start(compilations, function(err) {
    if (err) {
      done(err);
    }
    else {
      done(null, { serializer });
    }
  });
}

function startCluster(state, done) {
  const createCluster = state.config.threads === 1 ?
    divisus.createForegroundCluster :
    divisus.createCluster
  ;

  const cluster = createCluster({ size: state.config.threads })

  cluster.start(function(err) {
    if (err) {
      done(err);
    }
    else {
      done(null, { cluster });
    }
  });
}

function startServices(state, done) {
  const services = Service.start(Service.DefaultPreset, state);

  services.up(function(err) {
    done(err, { services });
  });
}

function createTempDirectory(state, done) {
  const tmpDir = state.config.tmpDir;

  if (tmpDir) {
    fs.ensureDir(tmpDir, function(err) {
      if (err) {
        done(err);
      }
      else {
        done(null, state);
      }
    });
  }
  else {
    fs.mkdtemp(path.join(os.tmpdir(), `megadoc-`), function(err, folder) {
      if (err) {
        done(err);
      }
      else {
        done(null, Object.assign({}, state, {
          config: Object.assign({}, state.config, {
            tmpDir: folder
          })
        }))
      }
    });
  }
}