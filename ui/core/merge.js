'use strict'

define(function (require, exports, module) {
  module.exports = merge;

  function merge(prev, patch) {
    if (patch !== null && patch !== undefined) {
      const patchProto = Object.getPrototypeOf(patch);
      if (patchProto === Object.prototype || patchProto === null) {
        const cloned = Array.isArray(prev) ? prev.slice() : Object.assign({}, prev);
        for (let prop of Object.getOwnPropertyNames(patch)) {
          const childPatch = patch[prop];
          if (typeof childPatch == 'undefined') {
            delete cloned[prop];
          } else {
            cloned[prop] = merge(cloned[prop], patch[prop]);
          }
        }
        return cloned;
      }

      if (patch instanceof Push) {
        return prev.concat([patch.elem]);
      }
    }

    return patch;
  }

  merge.push = function (elem) {
    return new Push(elem);
  };

  function Push(elem) {
    this.elem = elem;
  }

});
