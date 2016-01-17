'use strict';

Object.assign(define, {
  basePath: document.baseURI,
  modules: Object.create(null),
  requestedPaths: Object.create(null),
  unresolvedPaths: Object.create(null),
  amd: {},
});

function define(factory) {
  const definingModulePath = document.currentScript.src;
  if (definingModulePath in define.modules) {
    throw Error(`Module ${definingModulePath} is already defined.`);
  }

  const dependenciesPaths = extractRequireCalls(factory.toString())
                              .map(normalizeModPath);

  define.unresolvedPaths[definingModulePath] = {
    dependenciesPaths: dependenciesPaths,
    resolve: executeFactory,
  };

  dependenciesPaths.filter(depPath => !(depPath in define.requestedPaths))
                    .forEach(loadModule);

  let someModulesWasResolved;
  do {
    const resolvableModules = Object.keys(define.unresolvedPaths)
      .map(modPath => define.unresolvedPaths[modPath])
      .filter(mod => mod.dependenciesPaths.every(
        depPath => depPath in define.modules
      ));

    resolvableModules.forEach(mod => mod.resolve());
    someModulesWasResolved = resolvableModules.length;
  } while (someModulesWasResolved);


  function loadModule(modPath) {
    const scriptEl = document.createElement('script');
    scriptEl.src = modPath;
    scriptEl.async = 'async';
    scriptEl.onerror = onError;
    document.head.appendChild(scriptEl);
    define.requestedPaths[modPath] = true;

    function onError() {
      console.error(`Error while loading ${modPath} required from ${definingModulePath}`);
    }
  }

  function executeFactory() {
    delete define.unresolvedPaths[definingModulePath];

    const moduleObj = {};
    moduleObj.exports = factory;
    if (typeof factory == 'function') {
      moduleObj.exports = {};
      const returnValue = factory(require, moduleObj.exports, moduleObj);
      if (typeof returnValue != 'undefined') {
        moduleObj.exports = returnValue;
      }
    }

    define.modules[definingModulePath] = moduleObj.exports;
  }

  function extractRequireCalls(factorySource) {
    const commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
    const cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;
    const result = [];
    factorySource
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, (_, dep) => result.push(dep));
    return result;
  }

  function normalizeModPath(modPath) {
    return String(new URL(
      modPath + '.js',
      modPath[0] == '.' ? definingModulePath : define.basePath
    ));
  }

  function require(modPath) {
    const normModPath = normalizeModPath(modPath);
    if (normModPath in define.modules) {
      return define.modules[normModPath];
    } else {
      throw Error(`Module '${normModPath}' not loaded.`);
    }
  }
}
