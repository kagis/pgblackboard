describe('my queries', function () {
    var myQueries;
    var storage;
    var selectedItem;
    var addEvent;
    var storageKeyPrefix = MyQueries.prototype._storageKeyPrefix;
    var initialQueries = [
        'some query',
        'some awesome'
    ];

    beforeEach(function () {
    	storage = {
            get length() { return Object.keys(this._items).length; },
            key: function (i) { return Object.keys(this._items)[i]; },
            getItem: function (key) { return this._items[key]; },
            setItem: function (key, val) { return this._items[key] = val; },
            removeItem: function (key) { delete this._items[key]; },
            _items: {}
        };

        initialQueries.forEach(function (x, i) {
            storage.setItem(storageKeyPrefix.concat(i), x);
        });

        MyQueries.prototype._storage = storage;


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

    it('should save changes to storage', function () {
    	var newContent = 'changed content';
    	var firstItem = myQueries.items()[0];
    	firstItem.getDoc()(newContent);
    	expect(storage.getItem(firstItem.storageKey)).toEqual(newContent);
    });
});
