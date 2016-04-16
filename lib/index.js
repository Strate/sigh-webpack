'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sighCore = require('sigh-core');

var _sighCoreLibStream = require("sigh-core/lib/stream");

var _webpack = require("webpack");

var _webpack2 = _interopRequireDefault(_webpack);

var _webpackLibProgressPlugin = require("webpack/lib/ProgressPlugin");

var _webpackLibProgressPlugin2 = _interopRequireDefault(_webpackLibProgressPlugin);

var _webpackProgress = require("./webpackProgress");

var _webpackProgress2 = _interopRequireDefault(_webpackProgress);

var _lodash = require("lodash");

function webpackHandler(resolve, reject) {
  return function (err, stats) {
    if (err) {
      reject(err);
    } else if (stats) {
      var jsonStats = stats.toJson({
        errorDetails: true
      });
      var strStats = stats.toString({
        colors: true,
        cached: true,
        modules: false,
        assets: false,
        chunks: false,
        chunkModules: false
      });
      console.log(strStats);
      if (jsonStats.errors.length > 0) {
        reject(new Error("webpack build error"));
      } else {
        resolve("ok");
      }
    } else {
      reject(new Error("Webpack does not returns stats, something goes wrong"));
    }
  };
}

var lastWebpackPromise = {};

function initPromise() {
  lastWebpackPromise.promise = new _bluebird2['default'](function (resolve, reject) {
    lastWebpackPromise.resolve = resolve;
    lastWebpackPromise.reject = reject;
  });
}

var watchingInstance = undefined;

function compileWebpack(compiler, watch) {
  initPromise();
  (0, _sighCore.log)("run webpack...");
  if (watch) {
    (function () {
      var watching = compiler.watch({
        aggregateTimeout: 300
      }, webpackHandler(function (value) {
        watching.startTime = new Date().getTime();
        lastWebpackPromise.resolve(value);
        initPromise();
      }, function (reason) {
        lastWebpackPromise.reject(reason);
      }));
    })();
  } else {
    compiler.run(webpackHandler(function (value) {
      lastWebpackPromise.resolve(value);
      initPromise();
    }, function (reason) {
      lastWebpackPromise.reject(reason);
    }));
  }
}

function getCompiler(opts) {
  var cache = {}; // webpack cache object
  var webpack = opts.webpack || webpack;
  // https://gist.github.com/DatenMetzgerX/2a96ebf287b4311f4c18
  var compiler = webpack(Object.assign({}, opts.webpackConfig, {
    cache: cache
  }));
  // compiler.inputFileSystem = makeFsFallback(inputFs, fs);
  // compiler.outputFileSystem = outputFs
  // compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
  // compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
  compiler.apply(new _webpackLibProgressPlugin2['default']((0, _webpackProgress2['default'])()));
  return compiler;
}

var initialPhase = true;
var compiler = undefined;

exports['default'] = function (op) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  if (!compiler) {
    compiler = getCompiler(opts);
  }
  return (0, _sighCoreLibStream.liftErrors)(op.stream.flatMap(function (events) {
    if (initialPhase) {
      initialPhase = false;
      compileWebpack(compiler, op.watch);
    }
    return _sighCore.Bacon.fromPromise(lastWebpackPromise.promise.then(function () {
      return events;
    }));
  }));
};

module.exports = exports['default'];
//# sourceMappingURL=index.js.map