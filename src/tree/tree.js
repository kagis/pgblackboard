/**
@constructor
@param {function({isOpen})} openFunc */
function TreeNode(nodeDTO, openFunc) {
    this._nodeDTO = nodeDTO;
    this.nodes = ko.observable();

    this.open = openFunc;

    this.isExpanding = ko.observable(false);
    this.isExpanded = ko.pureComputed(this._checkIsExpanded, this);
    this.isCollapsed = ko.pureComputed(this._checkIsCollapsed, this);

    this.isOpened = ko.observable(false);

    this.name = nodeDTO['name'];
    this.type = nodeDTO['typ'];
    this.comment = nodeDTO['comment'];

    // toggler is visible when hasChildren is true
    this.hasChildren = nodeDTO['has_children'];

    // horizontal line is drawn above groupStart node
    this.isGroupStart = nodeDTO['isGroupStart'];
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
    this.isExpanding(true);
    this._loadChildren({
        parent: this._nodeDTO,
        success: this._onChildrenLoaded.bind(this),
        error: this._onChildrenLoadError.bind(this)
    });
};

TreeNode.prototype._onChildrenLoaded = function (nodeDTOs) {
    this.isExpanding(false);
    this.nodes(nodeDTOs.map(this._createChild, this));
};

TreeNode.prototype._createChild = function (dto) {
    return new this.constructor(dto);
};

TreeNode.prototype._onChildrenLoadError = function () {
    this.isExpanding(false);
    alert('ERROR while loading child tree nodes.');
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

TreeNode.prototype._loadChildren = function (options) {
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
