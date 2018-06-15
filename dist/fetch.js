'use strict';

var fetch = require('node-fetch');
var Promise = require('bluebird');

fetch.Promise = Promise;

var isInTest = typeof global.it === 'function';

if (isInTest) {
    global.fetch = fetch;
    module.exports = function () {
        var _global;

        return (_global = global).fetch.apply(_global, arguments);
    };
} else {
    module.exports = fetch;
}