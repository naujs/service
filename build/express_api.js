'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var express = require('express'),
    _ = require('lodash'),
    path = require('path'),
    filters = require('./filters'),
    NodeService = require('./node_service');

var ExpressApi = (function () {
  _createClass(ExpressApi, null, [{
    key: 'app',
    value: function app(_app) {
      return new this(_app);
    }
  }]);

  function ExpressApi(app) {
    _classCallCheck(this, ExpressApi);

    this._app = app;
  }

  _createClass(ExpressApi, [{
    key: 'app',
    value: function app(_app2) {
      this._app = _app2;
      return this;
    }
  }, {
    key: 'connector',
    value: function connector(_connector) {
      this._connector = _connector;
      return this;
    }
  }, {
    key: 'apiRoot',
    value: function apiRoot(p) {
      this._apiRoot = p;
      return this;
    }
  }, {
    key: 'build',
    value: function build(Service) {
      var _this = this;

      if (!(Service.prototype instanceof NodeService)) {
        throw 'Service must be a subclass of NodeService';
      }
      this._routers = this._routers || [];
      var endPoints = this._getEndPoints(Service);
      var router = express.Router();

      if (!this._connector) {
        throw 'Must set connector first';
      }

      _.each(endPoints, function (endPoint) {
        var route = router[endPoint.type];
        route.call(router, endPoint.path, function (req, res) {
          var service = new Service(_this._connector);

          var userInputs = _.extend({}, req.params, req.query, req.body);
          var args = endPoint.args || {};

          // based on the defined options and filter the args
          var filteredInputs = _.chain(userInputs).toPairs().map(function (pair) {
            var key = pair[0];
            var value = pair[1];

            var opts = args[key];
            if (!opts) {
              return [key, value];
            }

            if (_.isString(opts)) {
              opts = {
                type: opts
              };
            }

            if (_.isObject(opts)) {
              var filter = filters[opts.type];
              if (!filter) {
                console.warn(opts + ' is not a valid type');
                return [key, value];
              }

              value = filter(value);

              if (opts.required && value === undefined) {
                return null;
              }
            }

            return [key, value];
          }).compact().fromPairs().value();

          var diff = _.chain(userInputs).keys().difference(_.keys(filteredInputs)).value();

          if (diff.length) {
            return res.status(400).json({
              error: {
                code: 400,
                message: 'Missing required argument(s) ' + diff.join(', '),
                data: {
                  required: diff
                }
              },
              success: false,
              data: null
            });
          }

          service.execute(endPoint.handler, filteredInputs).then(function (result) {
            res.json({
              data: result,
              success: true,
              error: null
            });
          }, function (error) {
            var statusCode = error.statusCode || error.code || 500;
            res.status(statusCode).json({
              error: {
                code: error.code || statusCode,
                message: error.message || error.toString(),
                data: error.data || null
              },
              success: false,
              data: null
            });
          });
        });
      });

      this._routers.push(router);

      return this;
    }
  }, {
    key: 'done',
    value: function done() {
      var _this2 = this;

      _.each(this._routers, function (router) {
        _this2._app.use(_this2._apiRoot || '/', router);
      });

      return this._app;
    }
  }, {
    key: '_buildPath',
    value: function _buildPath(Service, p) {
      var apiName = Service.prototype.getApiName();

      if (apiName.charAt(0) !== '/') {
        apiName = '/' + apiName;
      }

      return path.join(apiName, p);
    }
  }, {
    key: '_getEndPoints',
    value: function _getEndPoints(Service) {
      var _this3 = this;

      var endPoints = Service.prototype.getEndPoints();

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
          path: _this3._buildPath(Service, options.path),
          args: args
        };
      });
    }
  }]);

  return ExpressApi;
})();

module.exports = ExpressApi;