/**
@constructor */
function TreeNode(nodeDTO, getChildren) {
    this._nodeDTO = nodeDTO;
    this._getChildren = getChildren || this._getChildren;
    this.nodes = ko.observable();
    this.childrenAreLoading = ko.observable(false);

    this.isExpanded = ko.pureComputed(function () {
        return this.nodes() && !this.childrenAreLoading();
    }, this);
    this.isCollapsed = ko.pureComputed(function () {
        return !this.nodes() && !this.childrenAreLoading();
    }, this);

    this.isOpened = ko.observable(false);

    this.database = nodeDTO['database'];
    this.hasChildren = nodeDTO['has_children'];
    this.name = nodeDTO['name'];
    this.type = nodeDTO['typ'];
    this.id = nodeDTO['id'];
    this.isGroupStart = nodeDTO['isGroupStart'];
    this.comment = nodeDTO['comment'];
};

TreeNode.prototype.toggle = function () {
    if (this.isExpanded()) {
        this.collapse();
    } else {
        this.expand();
    }
};

TreeNode.prototype.collapse = function () {
    this.nodes(null);
};

TreeNode.prototype.expand = function () {
    this.childrenAreLoading(true);
    this._getChildren({
        parent: this._nodeDTO,
        success: this._onChildrenLoaded.bind(this),
        error: this._onChildrenLoadError.bind(this)
    });
};

TreeNode.prototype._onChildrenLoaded = function (nodeDTOs) {
    this.childrenAreLoading(false);
    this.nodes(nodeDTOs.map(this._createChild, this));
};

TreeNode.prototype._createChild = function (dto) {
    return new this.constructor(dto, this._getChildren);
};

TreeNode.prototype._onChildrenLoadError = function () {
    this.childrenAreLoading(false);
    alert('ERROR while loading child tree nodes.');
};

TreeNode.prototype.open = function () {
    alert('open');
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

TreeNode.prototype._getChildren = function (options) {
    return this._sqlexec('children', options);
};

TreeNode.prototype._sqlexec = function (action, options) {
    var req = new XMLHttpRequest();
    req.onload = onLoad;
    req.onerror = onLoadEnd;
    req.open('GET', [
        'db',
        options.nodeDTO['database'],
        'nodes',
        options.nodeDTO['typ'],
        options.nodeDTO['id'] || '_',
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
