var ko = require('knockout');

module.exports = Tree;

/** @constructor */
function Tree(params) {

    /** @expose */
    this.selectNode = params['selectNodeCallback'];

    /** @expose */
    this.nodes = params['nodes'].map(this.createNode, this);

    /** @private */
    this.lastNodeWithMessage = null;
}

Tree.TreeNode = TreeNode;

/** @private */
Tree.prototype.createNode = function (dto, index, array) {
    var groupStart = index > 0 &&
                     array[index - 1]['group'] != dto['group'] &&
                     dto['group'];
    return new TreeNode(dto, this, groupStart);
};

/** @private */
Tree.prototype.setNodeMessage = function (node, message) {
    if (this.lastNodeWithMessage) {
        this.lastNodeWithMessage.message(null);
    }

    if (message) {
        this.lastNodeWithMessage = node;
    }

    node.message(message);
};

/** @constructor */
function TreeNode(nodeDTO, ownerTree, groupStart) {

    /** @private */
    this.path = nodeDTO['path'];

    /** @private */
    this.ownerTree = ownerTree;

    /** @private */
    this.allNodes = ko.observable(null);

    /** @expose */
    this.allNodesCount = ko.pureComputed(this.getAllNodesCount, this);

    /** @expose */
    this.limitNodes = ko.observable(true);

    /** @expose */
    this.nodesAreLimited = ko.pureComputed(this.checkNodesAreLimited, this);

    /** @expose */
    this.nodes = ko.pureComputed(this.getNodes, this);

    /** @expose */
    this.message = ko.observable(null);

    /** @expose */
    this.isExpanding = ko.observable(false);

    /** @expose */
    this.isExpanded = ko.pureComputed(this.checkIsExpanded, this);

    /** @expose */
    this.isCollapsed = ko.pureComputed(this.checkIsCollapsed, this);

    /** @expose */
    this.isSelected = ko.observable(false);

    /** @expose */
    this.name = nodeDTO['name'];

    /** @expose */
    this.type = nodeDTO['typ'];

    /** @expose */
    this.comment = nodeDTO['comment'];

    /**
     * toggler is visible when `isExpandable` is true
     * @expose
     */
    this.isExpandable = nodeDTO['can_have_children'];

    /**
     * horizontal line is drawn above groupStart node
     * @expose
     */
    this.groupStart = groupStart;
}

/** @private */
TreeNode.prototype.nodeLimit = 200;

/** @private */
TreeNode.prototype.getAllNodesCount = function () {
    return this.allNodes() && this.allNodes().length;
};

/** @private */
TreeNode.prototype.checkNodesAreLimited = function () {
    var limitedNodes = this.nodes();
    var allNodes = this.allNodes();
    return Boolean(
        allNodes &&
        limitedNodes &&
        limitedNodes.length < allNodes.length
    );
};

/** @private */
TreeNode.prototype.getNodes = function () {
    var allNodes = this.allNodes();
    return allNodes && (
        this.limitNodes() ? allNodes.slice(0, this.nodeLimit) : allNodes
    );
};

/** @expose */
TreeNode.prototype.toggle = function () {
    if (this.isExpanded()) {
        this.collapse();
    } else {
        this.expand();
    }
};

/** @expose */
TreeNode.prototype.showAllNodes = function () {
    this.limitNodes(false);
};

/** @private */
TreeNode.prototype.collapse = function () {
    this.allNodes(null);
    this.limitNodes(true);
};

/** @private */
TreeNode.prototype.expand = function () {
    this.isExpanding(true);
    this.loadChildren({
        success: this.onChildrenLoaded.bind(this),
        error: this.onChildrenLoadError.bind(this)
    });
};

/** @private */
TreeNode.prototype.onChildrenLoaded = function (nodeDTOs) {
    this.isExpanding(false);
    if (nodeDTOs.length > 0) {
        this.ownerTree.setNodeMessage(this, null);
        this.allNodes(nodeDTOs.map(this.ownerTree.createNode, this.ownerTree));
    } else {
        this.ownerTree.setNodeMessage(this, {
            'isError': false,
            'body': 'There is no child items yet.'
        });
    }
};

/** @private */
TreeNode.prototype.onChildrenLoadError = function (errorMessage) {
    this.isExpanding(false);
    this.ownerTree.setNodeMessage(this, {
        'isError': true,
        'body': errorMessage
    });
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

    this.request('definitions', {
        success: function (resp) {
            doc(resp);
            doc.notifySubscribers(doc(), 'ready');
        },
        error: function (message) {
            doc('/*\n  ' + message + '\n*/');
            doc.notifySubscribers(doc(), 'ready');
        }
    });

    return doc;
};

/** @private */
TreeNode.prototype.loadChildren = function (options) {
    return this.request('tree', options);
};

/** @private */
TreeNode.prototype.request = function (action, options) {
    var req = new XMLHttpRequest();
    req.onload = onLoad;
    req.onerror = onError;
    req.open('GET', [action].concat(this.path)
                            .map(encodeURIComponent)
                            .join('/'));
    req.send();

    var callbackContext = this;

    function onLoad(e) {
        var responseObj = JSON.parse(e.target.responseText);
        if (e.target.status === 200) {
            options.success.call(callbackContext, responseObj);
        } else {
            options.error.call(callbackContext, responseObj);
        }
    }

    function onError(e) {
        options.error.call(
            callbackContext,
            'Network error occured.'
        );
    }
};
