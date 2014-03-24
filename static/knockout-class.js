var originalGetBindingAccessors = ko.bindingProvider.instance.getBindingAccessors;
ko.bindingProvider.instance.getBindingAccessors = function (node, bindingContext) {
    var bindingsAccessor = originalGetBindingAccessors.apply(this, arguments);
    if (node.nodeType == 1 /* element */) {
        var attrs = node.attributes;
        var dotBindingStr = '';
        for (var i = attrs.length - 1; i >= 0; i--) {
            var attr = attrs[i];
            var m = attr.name.match(/^data-bind\.(.*)/);
            if (m) {
                dotBindingStr += '"' + m[1] + '":' + attr.value + ',';
            }
        }
        if (dotBindingStr) {
            var classBindingsAccessor = this.parseBindingsString(
                'css: {' + dotBindingStr + '}',
                bindingContext,
                node,
                { valueAccessors: true }).css;

            if (!bindingsAccessor) {
                bindingsAccessor = {};
            }

            if (bindingsAccessor.css) {
                var originalCss = bindingsAccessor.css;
                bindingsAccessor.css = function () {
                    return ko.utils.extend(
                        classBindingsAccessor(),
                        originalCss());
                }
            } else {
                bindingsAccessor.css = classBindingsAccessor;
            }
        }
    }
    return bindingsAccessor;
};
