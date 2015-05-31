var ko = {};

/**
@param {*=} initialValue
@returns {Observable|Function} */
ko.observable = function (initialValue) {};

/**
@param {function()|{
    read: Function,
    write: function(*),
    owner,
    disposeWhenNodeIsRemoved: (Object|undefined)
}} evaluatorFunctionOrOptions
@param {*=} evaluatorFunctionTarget
@param {{disposeWhenNodeIsRemoved}=} options
@returns {Observable|Function} */
ko.computed = function (
    evaluatorFunctionOrOptions,
    evaluatorFunctionTarget,
    options
) {};

/**
@nosideeffects
@param {function()|{
    read: Function,
    write: function(*),
    owner
}} evaluatorFunctionOrOptions
@param {*=} evaluatorFunctionTarget
@returns {Observable|Function} */
ko.pureComputed = function (
    evaluatorFunctionOrOptions,
    evaluatorFunctionTarget
) {};

/**
@param {Array=} initialValues
@returns {ObservableArray|Function} */
ko.observableArray = function (initialValues) {};

/** @constructor */
ko.subscribable = function () {};

/**
 * @param {*} value
 * @param {string=} topic
 */
ko.subscribable.prototype.notifySubscribers = function (value, topic) {};

/**
 * @param {function(Object)} handler
 * @param {*=} handlerTarget
 * @param {string=} topic
 */
ko.subscribable.prototype.subscribe = function (handler, handlerTarget, topic) {};

/**
@param {*=} viewModel
@param {Object=} rootNode */
ko.applyBindings = function (viewModel, rootNode) {};

ko.applyBindingsToDescendants = function (viewModelOrBindingContext, rootNode) {};

ko.unwrap = function (value) {};

ko.contextFor = function (node) {};

ko.dataFor = function (node) {};

ko.setTemplateEngine = function (templateEngine) {};
/** @constructor */
ko.nativeTemplateEngine = function () {};
/** @param {Object=} templateDocument */
ko.nativeTemplateEngine.prototype.makeTemplateSource = function (template, templateDocument) {};

ko.toJS = function (val) {};
ko.toJSON = function (val) {};

/** @constructor */
ko.bindingProvider = function () {};

/**
 * @param {HTMLElement} node
 * @return {string}
 */
ko.bindingProvider.prototype.getBindingsString = function (node, bindingContext) {};

/**
 * @param {HTMLElement} node
 * @return {boolean}
 */
ko.bindingProvider.prototype.nodeHasBindings = function (node) {};

ko.bindingProvider.instance;

ko.utils = {};

ko.utils.isIe6 = {};
ko.utils.isIe7 = {};
ko.utils.ieVersion = {};

ko.utils.arrayForEach = function (array, action) {};
ko.utils.arrayIndexOf = function (array, item) {};

/**
@param {Array} array
@param {Function} predicate
@param {*=} predicateOwner */
ko.utils.arrayFirst = function (array, predicate, predicateOwner) {};
ko.utils.arrayRemoveItem = function (array, itemToRemove) {};

/**
@param {Array} array */
ko.utils.arrayGetDistinctValues = function (array) {};

/**
@param {Array} array
@param {Function} mapping
@returns {Array} */
ko.utils.arrayMap = function (array, mapping) {};

/**
@param {Array} array
@param {Function} predicate
@returns {Array} */
ko.utils.arrayFilter = function (array, predicate) {};

/**
@param {*} array
@param {Array} valuesToPush */
ko.utils.arrayPushAll = function (array, valuesToPush) {};

/**
@param {Object} obj
@param {Function} action */
ko.utils.objectForEach = function (obj, action) {};

/**
@param {Object} target
@param {Object} source */
ko.utils.extend = function (target, source) {};

/**
@param {!HTMLElement|!Window} element
@param {string} eventType
@param {Function} handler */
ko.utils.registerEventHandler = function (element, eventType, handler) {};

ko.utils.triggerEvent = function (element, eventType) {};
ko.utils.unwrapObservable = function (value) {};
ko.utils.peekObservable = function (value) {};
ko.utils.toggleDomNodeCssClass = function (node, className, shouldHaveClass) {};
ko.utils.setTextContent = function (element, textContent) {};
ko.utils.range = function (min, max) {};
ko.utils.getFormFields = function (form, fieldName) {};
ko.utils.parseJson = function (jsonString) {};
ko.utils.stringifyJson = function (data, replacer, space) {};
ko.utils.postJson = function (urlOrForm, data, options) {};

ko.bindingHandlers = {};
ko.components = {};
ko.extenders = {};

/**
@param {string} name,
@param {{
    template: (string|{element: string}),
    viewModel: (Function|{createViewModel}|undefined),
    synchronous: (boolean|undefined)
}} options */
ko.components.register = function (name, options) {};

/**
@param {Object} o
@return {boolean} */
ko.isWriteableObservable = function (o) {};

ko.utils.domNodeDisposal = {};

/**
@param {Object} node
@param {Function} callback */
ko.utils.domNodeDisposal.addDisposeCallback = function (node, callback) {};

// function Context() {}
// Context.prototype.$root = {};

/**
@constructor
@extends {Function} */
function Observable() {}
Observable.prototype.peek = function () {};

/**
@param {{rateLimit}} extenders */
Observable.prototype.extend = function (extenders) {};

/**
@param {Function} callback
@param {Object=} callbackTarget
@param {String=} event
@returns {Subscription} */
Observable.prototype.subscribe = function (callback, callbackTarget, event) {};

/**
@constructor */
function Subscribable() {}

/**
@param {Object=} callbackTarget
@param {String=} event
@returns {Subscription} */
Subscribable.prototype.subscribe = function (callback, callbackTarget, event) {};

/**
@constructor */
function Subscription() {}
Subscription.prototype.dispose = function () {};

/**
@constructor
@extends {Observable} */
function ObservableArray() {}

ObservableArray.prototype.remove = function (itemOrPredicate) {};

/**
@returns {Array} */
ObservableArray.prototype.removeAll = function () {};

ObservableArray.prototype.push = function (item) {};

ObservableArray.prototype.indexBy = function (func) {};
ObservableArray.prototype.uniqueIndexBy = function (func) {};
