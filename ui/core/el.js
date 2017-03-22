'use strict';

define(function (require, exports, module) {
  module.exports = el;

  function el(selector, ...args) {
    const [tag, ...classes] = selector.split('.');
    const node = { tag };

    if (classes.length) {
      node.attrs = { class: classes.join(' ') };
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

  });

  function Patch(applyFn) {
    this.apply = applyFn;
  }

});
