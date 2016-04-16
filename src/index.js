import Promise from 'bluebird'
import { log, Bacon } from 'sigh-core'
import {liftErrors, mapEvents} from "sigh-core/lib/stream"
import webpack from "webpack"
import ProgressPlugin from "webpack/lib/ProgressPlugin"
import getWebpackProgress from "./webpackProgress"
import {noop} from "lodash"

function webpackHandler(resolve, reject) {
  return function(err, stats) {
    if (err) {
      reject(err)
    } else if (stats) {
      let jsonStats = stats.toJson({
        errorDetails: true
      })
      let strStats = stats.toString({
        colors: true,
        cached: true,
        modules: false,
        assets: false,
        chunks: false,
        chunkModules: false
      })
      console.log(strStats);
      if (jsonStats.errors.length > 0) {
        reject(new Error("webpack build error"));
      } else {
        resolve("ok")
      }
    } else {
      reject(new Error("Webpack does not returns stats, something goes wrong"))
    }
  }
}

let lastWebpackPromise = {}

function initPromise() {
  lastWebpackPromise.promise = new Promise((resolve, reject) => {
    lastWebpackPromise.resolve = resolve;
    lastWebpackPromise.reject = reject;
  })
}

let watchingInstance

function compileWebpack(compiler, watch) {
  initPromise()
  log("run webpack...")
  if (watch) {
    let watching = compiler.watch({
      aggregateTimeout: 300
    }, webpackHandler(function(value) {
      watching.startTime = new Date().getTime()
      lastWebpackPromise.resolve(value)
      initPromise()
    }, function(reason) {
      lastWebpackPromise.reject(reason)
    }))
  } else {
    compiler.run(webpackHandler(function(value) {
      lastWebpackPromise.resolve(value)
      initPromise()
    }, function(reason) {
      lastWebpackPromise.reject(reason)
    }))
  }
}

function getCompiler(opts) {
  let cache = {}; // webpack cache object
  let webpack = opts.webpack || webpack
  // https://gist.github.com/DatenMetzgerX/2a96ebf287b4311f4c18
  let compiler = webpack(Object.assign({}, opts.webpackConfig, {
    cache
  }))
  // compiler.inputFileSystem = makeFsFallback(inputFs, fs);
  // compiler.outputFileSystem = outputFs
  // compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
  // compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
  compiler.apply(new ProgressPlugin(getWebpackProgress()));
  return compiler
}

let initialPhase = true;
let compiler

export default function(op, opts = {}) {
  if (!compiler) {
    compiler = getCompiler(opts)
  }
  return liftErrors(op.stream.flatMap(events => {
    if (initialPhase) {
      initialPhase = false;
      compileWebpack(compiler, op.watch)
    }
    return Bacon.fromPromise(lastWebpackPromise.promise.then(() => events))
  }))
}
