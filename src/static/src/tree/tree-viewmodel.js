var ko = require('knockout');

module.exports = Tree;

/** @constructor */
function Tree(params) {

    /** @expose */
    this.selectNode = params['selectNodeCallback'];

    /** @expose */
    this.nodes = params['nodes'].map(this.createNode, this);
}

Tree.TreeNode = TreeNode;

/** @private */
Tree.prototype.createNode = function (dto) {
    return new TreeNode(dto);
};

/** @constructor */
function TreeNode(nodeDTO) {
    this._nodeDTO = nodeDTO;

    /** @expose */
    this.nodes = ko.observable();

    /** @expose */
    this.isExpanding = ko.observable(false);

    /** @expose */
    this.isExpanded = ko.pureComputed(this.checkIsExpanded, this);

    /** @expose */
    this.isCollapsed = ko.pureComputed(this.checkIsCollapsed, this);

    this.expansionState = ko.pureComputed(this.getExpansionState, this);

    /** @expose */
    this.isSelected = ko.observable(false);

    /** @expose */
    this.name = nodeDTO['name'];

    /** @expose */
    this.type = nodeDTO['typ'];

    /** @expose */
    this.comment = nodeDTO['comment'];

    /** @expose
     * toggler is visible when `hasChildren` is true
     */
    this.hasChildren = nodeDTO['has_children'];

    /** @expose
     * horizontal line is drawn above groupStart node
     */
    this.isGroupStart = nodeDTO['isGroupStart'];
}

/** @expose */
TreeNode.prototype.toggle = function () {
    if (this.isExpanded()) {
        this.collapse();
    } else {
        this.expand();
    }
};

/** @private */
TreeNode.prototype.collapse = function () {
    this.nodes(null);
};

/** @private */
TreeNode.prototype.expand = function () {
    this.isExpanding(true);
    this.loadChildren({
        parent: this._nodeDTO,
        success: this.onChildrenLoaded.bind(this),
        error: this.onChildrenLoadError.bind(this)
    });
};

/** @private */
TreeNode.prototype.onChildrenLoaded = function (nodeDTOs) {
    this.isExpanding(false);
    this.nodes(nodeDTOs.map(this.createChild, this));
};

/** @private */
TreeNode.prototype.createChild = function (dto) {
    return new this.constructor(dto);
};

/** @private */
TreeNode.prototype.onChildrenLoadError = function () {
    this.isExpanding(false);
    alert('ERROR while loading child tree nodes.');
};

/** @private */
TreeNode.prototype.getExpansionState = function (argument) {
    return this.isExpanding() ? 'expanding' :
           this.isExpanded() ? 'expanded' : 'collapsed';
};

/** @private */
TreeNode.prototype.checkIsExpanded = function () {
    return this.nodes() && !this.isExpanding();
};

/** @private */
TreeNode.prototype.checkIsCollapsed = function () {
    return !this.nodes() && !this.isExpanding();
};

TreeNode.prototype.getDoc = function () {
    var doc = ko.observable().extend({ codeEditorDoc: true });

    // var quotedDatabase = this.database;
    // if (quotedDatabase.indexOf('"') !== -1) {
    //     quotedDatabase = '"' + quotedDatabase.replace(/"/g, '""') + '"';
    // }

    this._sqlexec('definition', {
        success: function (resp) {
            doc(resp);
            doc.notifySubscribers(doc(), 'ready');
        },
        error: function () {
            doc('/*\n  ERROR while loading definition.\n*/');
            doc.notifySubscribers(doc(), 'ready');
        }
    });

    return doc;
};

/** @private */
TreeNode.prototype.loadChildren = function (options) {
    return this._sqlexec('children', options);
};

TreeNode.prototype._sqlexec = function (action, options) {
    var req = new XMLHttpRequest();
    req.onload = onLoad;
    req.onerror = onLoadEnd;
    req.open('GET', [
        'databases',
        this._nodeDTO['database'],
        'objects',
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
