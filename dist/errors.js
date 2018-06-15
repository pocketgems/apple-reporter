'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ExtendableError = require('es6-error');

var AppleReporterError = function (_ExtendableError) {
    _inherits(AppleReporterError, _ExtendableError);

    function AppleReporterError(message) {
        var code = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;

        _classCallCheck(this, AppleReporterError);

        var _this = _possibleConstructorReturn(this, (AppleReporterError.__proto__ || Object.getPrototypeOf(AppleReporterError)).call(this, message));

        _this.code = String(code);
        return _this;
    }

    return AppleReporterError;
}(ExtendableError);

module.exports = {
    AppleReporterError
};