(function () {
function getFlatBindingsString(node) {
    if (node.nodeType !== 1 /* element */) return;

    var attrs = node.attributes;
    var bindingObj = {};
    for (var i = attrs.length - 1; i >= 0; i--) {
        var attr = attrs[i];
        if (attr.name.lastIndexOf('data-bind-', 0) === 0) {
            var proppath = attr.name
                .slice(10) // substring after 'data-bind-'
                // underscore_case to camelCase
                .replace(/_(.)/g, function (_, c) { return c.toUpperCase(); })
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
        for (propname in obj) {
            if (notFirst) result += ',';
            result += "'" + propname + "':";
            var child = obj[propname];
            result += (typeof child === 'string') ? child : '{' + rec(child) + '}';
            notFirst = true;
        }
        return result;
    })(bindingObj);
}
ko.flatBindingProvider = function () {
    ko.flatBindingProvider._super.constructor.apply(this, arguments);
}

ko.flatBindingProvider._super = ko.bindingProvider.prototype;
ko.flatBindingProvider.prototype = (function () {
    var f = function () {};
    f.prototype = ko.flatBindingProvider._super;
    return new f();
})();
ko.flatBindingProvider.prototype.constructor = ko.flatBindingProvider;

ko.flatBindingProvider.prototype.getBindingsString = function (node, bindingContext) {
    return getFlatBindingsString(node) ||
        ko.flatBindingProvider._super.getBindingsString.apply(this, arguments);
};

ko.flatBindingProvider.prototype.nodeHasBindings = function (node) {
    if (node.nodeType === 1 /* element */) {
        var attrs = node.attributes;
        for (var i = attrs.length - 1; i >= 0; i--) {
            if (attrs[i].name.lastIndexOf('data-bind-', 0) === 0) {
                return true;
            }
        }
    }
    return ko.flatBindingProvider._super.nodeHasBindings.apply(this, arguments);
};
})();
