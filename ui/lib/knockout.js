/// node_modules/knockout/build/output/knockout-latest.js
module.exports = window['ko'];

// блять!
var ko = window['ko']
if (ko['nativeTemplateEngine']['Va']) {
    ko['nativeTemplateEngine']['instance'] = ko['nativeTemplateEngine']['Va'];
}
