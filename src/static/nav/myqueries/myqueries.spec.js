describe('my queries', function () {
    var myQueries;
    var selectedItem;
    var addEvent;
    var initialQueries = [
        'some query',
        'some awesome'
    ];

    beforeEach(function () {
        MyQueries.prototype._storage = {
            get length() { return Object.keys(this._items).length; },
            key: function (i) { return Object.keys(this._items)[i]; },
            getItem: function (key) { return this._items[key]; },
            setItem: function (key, val) { return this._items[key] = val; },
            removeItem: function (key) { delete this._items[key]; },
            _items: {}
        };

        initialQueries.forEach(function (x, i) {
            MyQueries.prototype._storage.setItem(
                MyQueries.prototype._storageKeyPrefix.concat(i),
                x);
        });

        selectedItem = ko.observable();
        selectedItem.subscribe(function (selectingItem) {
        	selectingItem && selectingItem.isSelected(true);
        });
	    selectedItem.subscribe(function (unselectingItem) {
	    	unselectingItem && unselectingItem.isSelected(false);
	    }, null, 'beforeChange');

        addEvent = new ko.subscribable();
        myQueries = new MyQueries({
            selectItemCallback: selectedItem,
            addEvent: addEvent
        });
    });

    it('should load items from storage', function () {
    	var loadedQueries = myQueries.items().map(function (x) {
    		return x.getDoc()();
    	});
    	expect(loadedQueries).toEqual(initialQueries);
    });

    it('shoud reset selection when selected item removed', function () {
    	var firstItem = myQueries.items()[0];
    	myQueries.selectItem(firstItem);
    	expect(selectedItem()).toBe(firstItem);
    	myQueries.removeItem(firstItem);
    	expect(selectedItem()).toBe(null);
    });

    it('should be able to add new item', function () {
    	myQueries.items.removeAll();
    	var newDoc = ko.observable('new doc');
    	addEvent.notifySubscribers(newDoc);
    	expect(myQueries.items()[0].getDoc()).toBe(newDoc);
    });
});
