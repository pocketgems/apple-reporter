'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var Promise = require('bluebird');
var xml2js = require('xml2js');

var fetch = require('./fetch');
var util = require('./util');

var AppleReporterError = require('./errors').AppleReporterError;

Promise.promisifyAll(xml2js);

var errorMessages = {
    passwordRequired: 'Retrieving the access token requires the account password, but no password was supplied',
    accessTokenRequired: 'This method requires an access token, but no access token was supplied and retrieveAccessToken() was not called',
    needsNewAccessToken: 'Access token doesn\'t exist or is expired, pass { generateNewIfNeeded: true } to force generation of a new token',
    accessTokenSupplied: 'retrieveAccessToken() was called, but an access token was supplied at creation'
};

var Sales = function Sales(context) {
    _classCallCheck(this, Sales);

    function create(type, keys) {
        return function (params) {
            return context.fetch(context.config.salesUrl, _.compact(_.concat(`Sales.${type}`, util.getParams(keys, params).join(','))).join(', '));
        };
    }

    this.getAccounts = create('getAccounts');
    this.getReport = create('getReport', ['vendorNumber', 'reportType', 'reportSubType', 'dateType', 'date', 'reportVersion']);
    this.getStatus = create('getStatus');
    this.getVendors = create('getVendors');
    this.getVersion = _.bind(context.getVersion, context);
};

var Finance = function Finance(context) {
    _classCallCheck(this, Finance);

    function create(type, keys) {
        return function (params) {
            return context.fetch(context.config.financeUrl, _.compact(_.concat(`Finance.${type}`, util.getParams(keys, params).join(','))).join(', '));
        };
    }

    this.getAccounts = create('getAccounts');
    this.getReport = create('getReport', ['vendorNumber', 'regionCode', 'reportType', 'fiscalYear', 'fiscalPeriod']);
    this.getStatus = create('getStatus');
    this.getVendorsAndRegions = create('getVendorsAndRegions');
    this.getVersion = _.bind(context.getVersion, context);
};

var Reporter = function () {
    function Reporter(config) {
        _classCallCheck(this, Reporter);

        this.config = _.defaultsDeep(config, {
            baseUrl: 'https://reportingitc-reporter.apple.com/reportservice',
            financeUrl: '/finance/v1',
            mode: 'Robot.XML',
            salesUrl: '/sales/v1',
            version: '1.0',
            tokenOptions: {
                forceRetrieve: false,
                generateNewIfNeeded: false
            }
        });

        this.Sales = new Sales(this);
        this.Finance = new Finance(this);
    }

    _createClass(Reporter, [{
        key: 'fetchRaw',
        value: function fetchRaw(serviceUrl, params) {
            var _this = this;

            var usePassword = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            return Promise.try(function () {
                var url = `${_this.config.baseUrl}${serviceUrl}`;

                var data = {
                    userid: _this.config.userid,
                    account: _this.config.account,
                    version: _this.config.version,
                    mode: _this.config.mode,
                    queryInput: `[p=Reporter.properties, ${params}]`
                };

                if (usePassword && _this.config.password == null) throw new AppleReporterError(errorMessages.passwordRequired);
                if (!usePassword && _this.config.accesstoken == null) throw new AppleReporterError(errorMessages.accessTokenRequired);

                if (usePassword) {
                    data.password = _this.config.password;
                } else {
                    data.accesstoken = _this.config.accesstoken;
                }

                var method = 'POST';

                var headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                };

                var body = `jsonRequest=${JSON.stringify(data)}`;

                return fetch(url, { method, body, headers });
            });
        }
    }, {
        key: 'fetch',
        value: function fetch(serviceUrl, params) {
            var _this2 = this;

            var usePassword = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            return this.fetchRaw(serviceUrl, params, usePassword).then(function (response) {
                return Reporter.handleFetchResponse(_this2.config.mode, response);
            });
        }
    }, {
        key: 'retrieveAccessToken',
        value: function retrieveAccessToken() {
            var _this3 = this;

            var customOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            var options = _.merge(this.config.tokenOptions, customOptions);

            if (this.config.accesstoken != null) {
                // If we've already retrieved the access token (or one was given), skip retrieval
                // unless the user specifically asks to force retrieval
                if (options.forceRetrieve == null || !options.forceRetrieve) {
                    return Promise.resolve({ token: this.config.accesstoken, isNew: false });
                }
            }

            // If we get here and we don't have a password, that's a problem
            if (this.config.password == null) throw new AppleReporterError(errorMessages.passwordRequired);

            var newTokenWasGenerated = false;

            return this.fetch(this.config.salesUrl, '[Sales.viewToken]', true).then(function (result) {
                if (result.ViewToken.Message != null) return null;

                var expDate = new Date(result.ViewToken.ExpirationDate[0]);
                var accessToken = result.ViewToken.AccessToken[0];

                if (new Date() < expDate) return accessToken;
                return null;
            }).then(function (maybeAccessToken) {
                // If it was retrieved and not expired, return it
                if (maybeAccessToken != null) return maybeAccessToken;

                // Otherwise, we need to generate one, but only if generateNewIfNeeded is set
                if (options.generateNewIfNeeded == null || !options.generateNewIfNeeded) throw new AppleReporterError(errorMessages.needsNewAccessToken);

                newTokenWasGenerated = true;

                var url = _this3.config.salesUrl; // Doesn't matter
                var params = '[Sales.generateToken]';

                return _this3.fetchRaw(url, params, true).then(function (intermediateResponse) {
                    // To complete this kind of request, we have to make another request with some
                    // particular URL params, referencing the service request id passed in these response headers
                    var requestId = intermediateResponse.headers.service_request_id;
                    // Do a regular fetch so the result will get parsed
                    return _this3.fetchRaw(`${url}?isExistingToken=Y&requestId=${requestId}`, params, true);
                }).then(function (response) {
                    return Reporter.handleFetchResponse(_this3.config.mode, response);
                }).then(function (accessTokenResponse) {
                    return accessTokenResponse.ViewToken.AccessToken[0];
                });
            }).then(function (accessToken) {
                _this3.config.accesstoken = accessToken;
                return { token: accessToken, isNew: newTokenWasGenerated };
            });
        }
    }, {
        key: 'getVersion',
        value: function getVersion() {
            return Promise.resolve(this.config.version);
        }
    }]);

    return Reporter;
}();

Reporter.handleFetchResponse = function (mode, response) {
    return Promise.try(function () {
        if (response.ok) {
            if (response.headers.get('content-encoding') === 'agzip') {
                return util.gunzip(response.body);
            }

            return response.text();
        }

        if (mode === 'Robot.XML') {
            var textPromise = response.text();
            return textPromise.then(xml2js.parseStringAsync).then(util.xmlErrorThrower, function () {
                return textPromise.then(util.textErrorThrower);
            });
        }

        return response.text().then(util.textErrorThrower);
    }).then(function (text) {
        if (mode === 'Robot.XML') {
            return xml2js.parseStringAsync(text).catchReturn(text);
        }

        return text;
    });
};

module.exports = Reporter;