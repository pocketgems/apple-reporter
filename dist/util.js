'use strict';

var _ = require('lodash');
var streamToPromise = require('stream-to-promise');
var zlib = require('zlib');

var AppleReporterError = require('./errors').AppleReporterError;

// given a list of keys and an object, return an array of the values contained
// in the object in the order specified by keys
function getParams() {
    var keys = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    return _.reduce(keys, function (memo, key) {
        return params[key] ? _.concat(memo, params[key]) : memo;
    }, []);
}

function gunzip(stream) {
    return streamToPromise(stream.pipe(zlib.createGunzip())).then(function (buffer) {
        return buffer.toString('utf8');
    });
}

function xmlErrorThrower(xml) {
    throw new AppleReporterError(xml.Error.Message[0], xml.Error.Code[0]);
}

function textErrorThrower(text) {
    throw new AppleReporterError(text);
}

module.exports = {
    getParams,
    gunzip,
    xmlErrorThrower,
    textErrorThrower
};