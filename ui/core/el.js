define(function (require, exports, module) {
  'use strict';
  module.exports = el;

  function el(selector, ...args) {
    const [tag, ...classes] = selector.split('.');
    const node = {
      tag,
      attrs: {},
      children: null,
    };

    if (classes.length) {
      node.attrs['class'] = classes.join(' ');
    }

    for (let arg of args) {
      if (arg instanceof Patch) {
        arg.apply(node);
      } else if (arg) {
        node.children = node.children ? [].concat(node.children, arg) : arg;
      }
    }

    return node;
  }

  Object.assign(el, {

    attr(attr, value) {
      return el.patch(function (node) {
        el.setAttribute(node, attr, value);
      });
    },

    on(eventType, listener) {
      return el.patch(function (node) {
        el.addEventListener(node, eventType, listener);
      });
    },

    class(extraClass) {
      return el.patch(function (node) {
        el.replaceAttribute(node, 'class', function (prev) {
          return [prev, extraClass].filter(Boolean).join(' ');
        });
      });
    },

    style(prop, value) {
      return el.patch(function (node) {
        el.setStyle(node, prop, value);
      });
    },

    prop(prop, value) {
      return el.patch(function (node) {
        node[prop] = value;
      });
    },

    patch(applyFn) {
      return new Patch(applyFn);
    },

    addEventListener(node, eventType, listener) {
      const eventsObj = node.events || (node.events = {});
      const eventsArrOrFn = eventsObj[eventType];
      if (!eventsArrOrFn) {
        eventsObj[eventType] = listener;
      } else if (typeof eventsArrOrFn == 'function') {
        eventsArrOrFn[eventType] = [eventsArrOrFn, listener];
      } else if (Array.isArray(eventsArrOrFn)) {
        eventsArrOrFn.push(listener);
      }
    },

    setStyle(node, prop, value) {
      el.replaceAttribute(node, 'style', function (style = {}) {
        style[prop] = value;
        return style;
      });
    },

    setAttribute(node, attr, value) {
      el.replaceAttribute(node, attr, _ => value);
    },

    replaceAttribute(node, attr, replaceFn) {
      const attrsObj = node.attrs || (node.attrs = {});
      attrsObj[attr] = replaceFn(attrsObj[attr]);
    },
    
    _memoized_arg: Symbol('memoized_arg'),
    memoize(render, arg) {
      return function render_memoized(old_node) {
        if (old_node && obj_shallow_eq(old_node[el._memoized_arg], arg)) {
          return;
        }
        return Object.assign(render(arg), {
          [el._memoized_arg]: arg,
        });
      };
    },

  });

  function Patch(applyFn) {
    this.apply = applyFn;
  }
  
  function obj_shallow_eq(a, b) {
    if (a !== b) {
      for (let key in a) {
        if (a[key] !== b[key]) {
          return false;
        }
      }
    }
    return true;
  }

});
