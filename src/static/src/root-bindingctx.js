module.exports = {
    myQueriesStorage: window.localStorage,
    databases: window.pgbbInitialData['databases'],
    initialCode: window.location.hash || 'select \'awesome\''
};
