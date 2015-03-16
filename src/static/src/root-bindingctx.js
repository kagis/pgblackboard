module.exports = {
    myQueriesStorage: window.localStorage,
    databases: initialData['databases'],
    initialCode: window.location.hash || 'select \'awesome\''
};
