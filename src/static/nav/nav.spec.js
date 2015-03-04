describe('nav', function () {
    var nav;
    var selectedDoc;
    var greetingDoc;

    Nav.prototype.createGreetingDoc = function () {
        return greetingDoc;
    };

    beforeEach(function () {
        greetingDoc = ko.observable('hello test');
        nav = new Nav({
            selectedDoc: selectedDoc = ko.observable()
        });
    });

    it('should navigate to greeting document initially', function () {
        expect(selectedDoc()).toBe(greetingDoc);
    });

    it('should navigate to greeting document when selected myquery was removed', function () {
        selectedDoc({ /* some object */ })
        nav.selectMyQuery(null);
        expect(selectedDoc()).toBe(greetingDoc);
    });

    it('should be able to select treenode', function () {
        var treeNodeDoc = ko.observable();
        var treeNode = {
            getDoc: function () { return treeNodeDoc; },
            isSelected: ko.observable(false)
        };
        nav.selectTreeNode(treeNode);
        expect(treeNode.isSelected()).toBeTruthy();
        expect(selectedDoc()).toBe(treeNodeDoc);
    });

    it('should be able to select myquery', function () {
        var myQueryDoc = ko.observable();
        var myQuery = {
            getDoc: function () { return myQueryDoc; },
            isSelected: ko.observable(false)
        };
        nav.selectMyQuery(myQuery);
        expect(myQuery.isSelected()).toBeTruthy();
        expect(selectedDoc()).toBe(myQueryDoc);
    });

    it('should create myquery when treenode definition was touched', function () {
        var addMyQueryHandler = jasmine.createSpy('addMyQueryHandler');
        nav.addMyQueryEvent.subscribe(addMyQueryHandler);

        var treeNodeDoc = ko.observable();
        nav.selectTreeNode({
            getDoc: function () { return treeNodeDoc; },
            isSelected: ko.observable(false)
        });
        treeNodeDoc('loaded tree node definition');
        treeNodeDoc.notifySubscribers(treeNodeDoc(), 'ready');
        expect(addMyQueryHandler).not.toHaveBeenCalled();

        treeNodeDoc('something changed');
        expect(addMyQueryHandler).toHaveBeenCalledWith(treeNodeDoc);
    });

});
