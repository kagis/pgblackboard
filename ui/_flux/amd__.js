define.amd = {};
define._modules = Object.create(null);
define._baseURI = document.baseURI;


function define(factory) {
  var definingModuleURI = document.currentScript.src;

  var factoryCode = factory.toString();
  console.group(definingModuleURI);
  factoryCode.replace(/require\s*\('(.*?)'\)/g, function (_, relDependencyModPath) {
    var absDependencyModPath = new URL(
      relDependencyModPath + '.js',
      relDependencyModPath[0] == '.' ? definingModuleURI : define._baseURI
    ).toString();

    // var scriptEl = document.createElement('script');
    // scriptEl.src = absDependencyModPath;
    // document.head.appendChild(scriptEl);

    console.log('depends on', absDependencyModPath);
  });
  console.groupEnd();

  var module = { exports: factory };
  if (typeof factory == 'function') {
    var returnValue = factory(require, module.exports, module);
    if (typeof returnValue != 'undefined') {
      module.exports = returnValue;
    }
  }
  define._modules[definingModuleURI] = module;

  function require(mod) {
    var absoluteModuleURI = new URL(
      mod + '.js',
      mod[0] == '.' ? definingModuleURI : define._baseURI
    );

    var module = define._modules[absoluteModuleURI];
    if (!module) {
      throw Error(`Module '${absoluteModuleURI}' not loaded.`);
    }
    return module.exports;
  }
}
