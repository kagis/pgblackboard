describe('tree node', function () {
    var TreeNode = require('../nav/tree/treeViewModel').TreeNode,
        ko = require('knockout');

    var treeNode;
    var finishChildrenLoad;

    function treeNodeState() {
        return [
            treeNode.isCollapsed() && 'collapsed',
            treeNode.isExpanding() && 'expanding',
            treeNode.isExpanded() && 'expanded'
        ].filter(function (it) { return it });
    }

    beforeEach(function () {
        treeNode = new TreeNode({});
        spyOn(treeNode, 'loadChildren').and.callFake(function (options) {
            finishChildrenLoad = function (children) {
                options.success.call(treeNode, children);
            };
        });
    });

    it('should be initialy collapsed', function () {
        expect(treeNodeState()).toEqual(['collapsed']);
    });

    it('should begin expanding when toggle', function () {
        treeNode.toggle();
        expect(treeNodeState()).toEqual(['expanding']);
    });

    it('should expand after children are loaded', function () {
        treeNode.toggle();
        finishChildrenLoad([{ name: 'childNode' }]);
        expect(treeNodeState()).toEqual(['expanded']);
        expect(treeNode.nodes().length).toBe(1);
        expect(treeNode.nodes()[0].name).toBe('childNode');
    });

    it('should collapse when toggle again', function () {
        treeNode.toggle();
        finishChildrenLoad([]);
        treeNode.toggle();
        expect(treeNodeState()).toEqual(['collapsed']);
    });
});
