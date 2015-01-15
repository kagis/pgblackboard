(function () {
'use strict';

/** @constructor */
ko.flatBindingProvider = function () {
    ko.bindingProvider.apply(this, arguments);
};

ko.flatBindingProvider.prototype = (function () {
    var f = function () {};
    f.prototype = ko.bindingProvider.prototype;
    return new f();
})();


ko.utils.extend(ko.flatBindingProvider.prototype,
    /** @lends {ko.flatBindingProvider.prototype} */ {

    constructor: ko.flatBindingProvider,

    _getFlatBindingsString: function (node) {
        if (node.nodeType !== 1 /* element */) return;

        function replaceToUpperCase(_, c) {
            return c.toUpperCase();
        }

        var attrs = node.attributes;
        var bindingObj = {};
        for (var i = attrs.length - 1; i >= 0; i--) {
            var attr = attrs[i];
            if (ko.utils.stringStartsWith(attr.name, 'data-bind-')) {
                var proppath = attr.name
                    .slice(10) // substring after 'data-bind-'
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
                if (notFirst) result += ',';
                result += "'" + propname + "':";
                var child = obj[propname];
                result += (typeof child === 'string') ? child : '{' + rec(child) + '}';
                notFirst = true;
            }
            return result;
        })(bindingObj);
    },

    getBindingsString: function (node, bindingContext) {
        return this._getFlatBindingsString(node) ||
            ko.bindingProvider.prototype.getBindingsString.apply(this, arguments);
    },

    nodeHasBindings: function (node) {
        if (node.nodeType === 1 /* element */) {
            var attrs = node.attributes;
            for (var i = attrs.length - 1; i >= 0; i--) {
                if (ko.utils.stringStartsWith(attrs[i].name, 'data-bind-')) {
                    return true;
                }
            }
        }
        return ko.bindingProvider.prototype.nodeHasBindings.apply(this, arguments);
    }

});

})();
