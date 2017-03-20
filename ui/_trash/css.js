define(function (require, exports, module) {

  var styleEl = document.createElement('style');
  document.head.appendChild(styleEl);

  var lastClass = 0;

  exports.class = function (style) {
    var className = 'c' + (++lastClass);
    styleEl.innerHTML += '.' + className + '{' +
      Object.keys(style).map(prop => prop + ':' + style[prop] + ';').join('') +
      '}';
    return className;
  };
});
