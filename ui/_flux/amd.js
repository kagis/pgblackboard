define.basePath = document.baseURI;
define.modules = {};
define.requestedPaths = {};
define.unresolvedPaths = {};

function define(factory) {
  var definingModulePath = document.currentScript.src;
  if (definingModulePath in define.modules) {
    throw Error(`Module ${definingModulePath} is already defined.`);
  }

  var dependenciesPaths = extractRequireCalls(factory.toString()).map(normalizeModPath);

  define.unresolvedPaths[definingModulePath] = {
    dependenciesPaths: dependenciesPaths,
    resolve: executeFactory,
  };

  dependenciesPaths.filter(depPath => !(depPath in define.requestedPaths))
                    .forEach(loadModule);

  do {
    var resolvableModules = Object.keys(define.unresolvedPaths)
      .map(modPath => define.unresolvedPaths[modPath])
      .filter(mod => mod.dependenciesPaths.every(
        depPath => depPath in define.modules
      ));

    resolvableModules.forEach(mod => mod.resolve());

  } while (resolvableModules.length);


  function loadModule(modPath) {
    var scriptEl = document.createElement('script');
    scriptEl.src = modPath;
    scriptEl.async = 'async';
    document.head.appendChild(scriptEl);
    define.requestedPaths[modPath] = true;
  }

  function executeFactory() {
    delete define.unresolvedPaths[definingModulePath];

    var moduleObj = {};
    moduleObj.exports = factory;
    if (typeof factory == 'function') {
      moduleObj.exports = {};
      var returnValue = factory(require, moduleObj.exports, moduleObj);
      if (typeof returnValue != 'undefined') {
        moduleObj.exports = returnValue;
      }
    }

    define.modules[definingModulePath] = moduleObj.exports;
  }

  function extractRequireCalls(factorySource) {
    var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
    var cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;
    var result = [];
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
    var normModPath = normalizeModPath(modPath);
    if (normModPath in define.modules) {
      return define.modules[normModPath];
    } else {
      throw Error(`Module '${normModPath}' not loaded.`);
    }
  }
}
