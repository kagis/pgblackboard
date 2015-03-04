ko.components.register('x-tree', {
    template: { element: 'tree-tmpl' },
    viewModel: Tree,
    synchronous: true
});

/**
@constructor */
function Tree(params) {
    this['selectNode'] = params['selectNodeCallback'];
    this['nodes'] = params['nodes'].map(this.createNode, this);
}

/**
@private */
Tree.prototype.createNode = function (dto) {
    return new TreeNode(dto, this.selectedNode);
};


/**
@constructor */
function TreeNode(nodeDTO) {
    this._nodeDTO = nodeDTO;
    this.nodes = ko.observable();

    this.isExpanding = ko.observable(false);
    this.isExpanded = ko.pureComputed(this._checkIsExpanded, this);
    this.isCollapsed = ko.pureComputed(this._checkIsCollapsed, this);
    this.expansionState = ko.pureComputed(this._getExpansionState, this);

    this['isSelected'] = ko.observable(false);

    this['name'] = nodeDTO['name'];
    this['type'] = nodeDTO['typ'];
    this['comment'] = nodeDTO['comment'];

    // toggler is visible when['hasChildren'] is true
    this['hasChildren'] = nodeDTO['has_children'];

    // horizontal line is drawn above groupStart node
    this.isGroupStart = nodeDTO['isGroupStart'];
};

TreeNode.prototype['toggle'] = function () {
    if (this.isExpanded()) {
        this.collapse();
    } else {
        this.expand();
    }
};

/**
@private */
TreeNode.prototype.collapse = function () {
    this.nodes(null);
};

/**
@private */
TreeNode.prototype.expand = function () {
    this.isExpanding(true);
    this.loadChildren({
        parent: this._nodeDTO,
        success: this.onChildrenLoaded.bind(this),
        error: this.onChildrenLoadError.bind(this)
    });
};

/**
@private */
TreeNode.prototype.onChildrenLoaded = function (nodeDTOs) {
    this.isExpanding(false);
    this.nodes(nodeDTOs.map(this.createChild, this));
};

/**
@private */
TreeNode.prototype.createChild = function (dto) {
    return new this.constructor(dto);
};

/**
@private */
TreeNode.prototype.onChildrenLoadError = function () {
    this.isExpanding(false);
    alert('ERROR while loading child tree nodes.');
};

TreeNode.prototype._getExpansionState = function (argument) {
    return this.isExpanding() ? 'expanding' :
           this.isExpanded() ? 'expanded' : 'collapsed';
};

TreeNode.prototype._checkIsExpanded = function () {
    return this.nodes() && !this.isExpanding();
};

TreeNode.prototype._checkIsCollapsed = function () {
    return !this.nodes() && !this.isExpanding();
};

TreeNode.prototype.getDefinition = function (onComplete, context) {
    var quotedDatabase = this.database;
    if (quotedDatabase.indexOf('"') !== -1) {
        quotedDatabase = '"' + quotedDatabase.replace(/"/g, '""') + '"';
    }

    this._sqlexec({
        query: 'definition',
        success: function (resp) {
            onComplete.call(context,
                '\\connect ' + quotedDatabase +
                '\n\n' + resp
            );
        },
        error: function () {
            onComplete.call(context, '/*\n  ERROR while loading definition.\n*/');
        }
    });
};

/**
@private */
TreeNode.prototype.loadChildren = function (options) {
    return this._sqlexec('children', options);
};

TreeNode.prototype._sqlexec = function (action, options) {
    var req = new XMLHttpRequest();
    req.onload = onLoad;
    req.onerror = onLoadEnd;
    req.open('GET', [
        'db',
        this._nodeDTO['database'],
        'nodes',
        this._nodeDTO['typ'],
        this._nodeDTO['id'] || '_',
        action
    ].map(encodeURIComponent).join('/'));

    req.send();


    var callbackContext = this;

    function onLoad(e) {
        if (e.target.status === 200) {
            // because IE does not support responseType='json'
            var jsonResp = JSON.parse(e.target.responseText);
            options.success.call(callbackContext, jsonResp);
        } else {
            options.error.call(callbackContext);
        }
    }

    function onLoadEnd(e) {
        options.error.call(callbackContext);
    }
};


ko.bindingHandlers['mod'] = {
    'before': ['css'],
    'init': function (element, valueAccessor) {
        var modSplitter = '--';
        var firstClassPref = element.className.trimLeft().split(' ')[0] + modSplitter;
        var currentMod;
        ko.computed(function () {
            var value = ko.unwrap(valueAccessor());
            if (typeof value == 'object') {
                ko.utils.objectForEach(value, function (modName, shouldHaveMod) {
                    ko.utils.toggleDomNodeCssClass(element,
                                                   firstClassPref + modName,
                                                   ko.unwrap(shouldHaveMod));
                });
            } else {
                value = String(value || '');
                ko.utils.toggleDomNodeCssClass(element, firstClassPref + currentMod, false);
                ko.utils.toggleDomNodeCssClass(element, firstClassPref + value, true);
                currentMod = value;
            }
        }, null, { 'disposeWhenNodeIsRemoved': element });
    }
};
