var ko = require('knockout');

/**
 * @constructor
 * @extends {ko.bindingProvider}
 */
function flatBindingProvider() {
    ko.bindingProvider.apply(this, arguments);
}

flatBindingProvider.prototype = Object.create(ko.bindingProvider.prototype);
flatBindingProvider.prototype.constructor = ko.flatBindingProvider;
flatBindingProvider.prototype.getBindingsString = function (node, bindingContext) {
    return getBindingsStringFromFlatAttrs(node) ||
        ko.bindingProvider.prototype.getBindingsString.apply(this, arguments);
};
flatBindingProvider.prototype.nodeHasBindings = function (node) {
    if (node.nodeType === 1 /* element */) {
        var attrs = node.attributes;
        for (var i = attrs.length - 1; i >= 0; i--) {
            if (attrs[i].name.lastIndexOf(ATTR_PREFIX, 0) === 0) {
                return true;
            }
        }
    }
    return ko.bindingProvider.prototype.nodeHasBindings.apply(this, arguments);
};

var ATTR_PREFIX = 'data-bind.';

function getBindingsStringFromFlatAttrs(node) {
    if (node.nodeType !== 1 /* element */) { return; }

    function replaceToUpperCase(_, c) {
        return c.toUpperCase();
    }

    var attrs = node.attributes;
    var bindingObj = {};
    for (var i = attrs.length - 1; i >= 0; i--) {
        var attr = attrs[i];
        if (attr.name.lastIndexOf(ATTR_PREFIX, 0) === 0) {
            var proppath = attr.name
                .slice(ATTR_PREFIX.length) // substring after ATTR_PREFIX
                // underscore_case to camelCase
                .replace(/_(.)/g, replaceToUpperCase)
                .split('.');
            var targetObj = bindingObj;
            while (proppath.length > 1) {
                var propname = proppath.shift();
                targetObj = propname in targetObj ? targetObj[propname] : (targetObj[propname] = {});
            }
            targetObj[proppath[0]] = attr.value;
        }
    }

    return (function rec(obj) {
        var result = '';
        var notFirst = false;
        for (var propname in obj) {
            if (notFirst) { result += ','; }
            result += '\'' + propname + '\':';
            var child = obj[propname];
            result += (typeof child === 'string') ? child : '{' + rec(child) + '}';
            notFirst = true;
        }
        return result;
    })(bindingObj);
}

module.exports = flatBindingProvider;
