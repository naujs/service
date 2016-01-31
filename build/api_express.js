'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Component = require('@naujs/component');

var express = require('express'),
    _ = require('lodash');

var NodeService = require('./node_service');

/**
 * This class represents a Router instance for an express application
 * Based on the provided service, it will automatically create API end points
 * @name ApiExpress
 * @constructor
 * @augments Component
 */

var ApiExpress = function (_Component) {
  _inherits(ApiExpress, _Component);

  function ApiExpress(service) {
    _classCallCheck(this, ApiExpress);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ApiExpress).call(this));

    if (service instanceof NodeService) {
      _this._service = service;
    } else {
      throw 'service must be an instance of NodeService';
    }
    return _this;
  }

  _createClass(ApiExpress, [{
    key: 'getEndPoints',
    value: function getEndPoints() {
      var endPoints = this._service.getEndPoints();

      return _.map(endPoints, function (options, handler) {
        var methodName = options.handler || handler;
        var type = (options.type || 'get').toLowerCase();
        if (!options.path) {
          throw 'Must provide path for an end point';
        }

        var args = _.clone(options.args || {});

        return {
          handler: methodName,
          type: type,
          path: options.path,
          args: args
        };
      });
    }
  }, {
    key: 'constructorRouter',
    value: function constructorRouter() {
      var _this2 = this;

      var endPoints = this.getEndPoints();
      var router = express.Router();

      _.each(endPoints, function (endPoint) {
        var route = router[endPoint.type];
        route.call(router, endPoint.path, function (req, res) {
          var _service;

          var handler = _this2._service[endPoint.handler];

          // if (!handler) {
          //   return res.status(500).json({
          //     error: {
          //       code: 500,
          //       message: `${endPoint.handler}() is not found`,
          //       data: null
          //     },
          //     data: null,
          //     success: false
          //   });
          // }

          var userInputs = _.extend({}, req.params, req.query, req.body);
          var args = _.map(endPoint.args, function (options, arg) {
            return userInputs[arg];
          });

          (_service = _this2._service).execute.apply(_service, [endPoint.handler].concat(_toConsumableArray(args))).then(function (result) {}, function (error) {});

          handler.apply(_this2._service, args).then(function (result) {
            res.json({
              data: result,
              success: true,
              error: null
            });
          }, function (error) {
            var httpCode = error.httpCode || error.code || 500;
            res.status(httpCode).json({
              error: {
                code: error.code || httpCode,
                message: error.toString(),
                data: error.data || null
              },
              success: false,
              data: null
            });
          });
        });
      }, this);
    }
  }]);

  return ApiExpress;
}(Component);