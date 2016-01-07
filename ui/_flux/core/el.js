define(function (require, exports, module) {
  module.exports = el;

  function el(selector) {
    var captures = selector.match(/^([\w-]*)((\.[\w-]+)*)((\[[^=]+(=[^\]]*)?\])*)$/);
    if (!captures) {
      throw Error('Unsupported selector ' + selector);
    }
    var tag = captures[1];
    var classes = captures[2].split('.').filter(Boolean);
    var attrs = (captures[4].match(/\[[^=]+(=[^\]]*)?\]/g) || [])
                        .map(it => it.match(/^\[([^=]+)(=([^\]]*))?\]$/))
                        .reduce((dict, it) => (dict[it[1]] = it[3], dict), {});

    var node = {};
    node.tag = tag || 'div';
    if (classes.length) {
      (node.attrs || (node.attrs = {})).class = classes.join(' ');
    }
    for (var attr in attrs) {
      (node.attrs || (node.attrs = {}))[attr] = attrs[attr];
    }

    for (var i = 1; i < arguments.length; i++) {
      var arg = arguments[i];
      if (arg instanceof el.Patch) {
        arg.apply(node);
      } else if (Array.isArray(arg)) {
        if (node.children) {
          Array.prototype.push.apply(node.children, arg);
        } else {
          node.children = arg;
        }
      } else if (arg) {
        (node.children || (node.children = [])).push(arg);
      }
    }

    return node;
  }

  el.attr = function el_attr(name, value) {
    return el.patch(function (node) {
      (node.attrs || (node.attrs = {}))[name] = value;
    });
  };

  el.on = function el_on(eventType, listener) {
    return el.patch(function (node) {
      el.addEventListener(node, eventType, listener);
    });
  };

  el.class = function el_class(extraClass) {
    return el.patch(function (node) {
      var attrs = ensureAttrs(node);
      attrs.class = [attrs.class, extraClass].filter(Boolean).join(' ');
    });
  };

  el.style = function el_style(prop, value) {
    return el.patch(function (node) {
      el.setStyle(node, prop, value);
    });
  };

  el.prop = function el_prop(prop, value) {
    return el.patch(function (node) {
      node[prop] = value;
    });
  };

  el.createRefCollection = function el_createRefCollection() {
    return function refCollection(name) {
      return el.patch(node => {
        refCollection[name] = node;
      });
    };
  };

  el.patch = function el_patch(applyFn) {
    return new el.Patch(applyFn);
  };

  el.Patch = function el_Patch(applyFn) {
    this.apply = applyFn;
  };

  el.addEventListener = function el_addEventListener(node, eventType, listener) {
    var eventsObj = node.events || (node.events = {});
    var eventsArrOrFn = eventsObj[eventType];
    if (!eventsArrOrFn) {
      eventsObj[eventType] = listener;
    } else if (typeof eventsArrOrFn == 'function') {
      eventsArrOrFn[eventType] = [eventsArrOrFn, listener];
    } else if (Array.isArray(eventsArrOrFn)) {
      eventsArrOrFn.push(listener);
    }
  };

  el.setStyle = function el_setStyle(node, prop, value) {
    var attrsObj = ensureAttrs(node);
    var styleObj = attrsObj.style || (attrsObj.style = {});
    styleObj[prop] = value;
  };

  function ensureAttrs(node) {
    return node.attrs || (node.attrs = {});
  }

});
