describe('code form', function () {
    var ko = require('knockout'),
        CodeForm = require('../src/codeform/codeform-viewmodel');

    var codeForm,
        initialDoc;

    beforeEach(function () {
        initialDoc = ko.observable();
        codeForm = new CodeForm({
            doc: ko.observable(initialDoc)
        });
    });

    it('should be loading when doc has no value', function () {
        expect(codeForm.isLoading()).toBeTruthy();
    });

    it('should be loaded when doc has value', function () {
        initialDoc('some content');
        expect(codeForm.isLoading()).toBeFalsy();
    });

    it('should keep previous doc until new doc is ready', function () {
        initialDoc('some content');
        var newDoc = ko.observable();
        codeForm.doc(newDoc);
        expect(codeForm.readyDoc()).toBe(initialDoc);
        newDoc('some content');
        expect(codeForm.readyDoc()).toBe(newDoc);
    });
});
