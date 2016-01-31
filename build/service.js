'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Component = require('@naujs/component'),
    PersistedModel = require('@naujs/persisted-model'),
    DataMapper = require('@naujs/data-mapper'),
    util = require('@naujs/util'),
    Promise = util.getPromise();

var _ = require('lodash'),
    express = require('express');

function constructFindParams(args) {
  return {
    where: args.where,
    include: args.include,
    fields: _.chain([args.field]).flatten().uniq().compact().value(),
    orders: _.chain([args.order]).flatten().uniq().compact().value(),
    limit: args.limit,
    offset: args.offset
  };
}

var Service = (function (_Component) {
  _inherits(Service, _Component);

  function Service(connector, context) {
    _classCallCheck(this, Service);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Service).call(this));

    _this._dataMapper = new DataMapper(connector);
    _this._context = context;
    return _this;
  }

  _createClass(Service, [{
    key: 'model',
    value: function model() {
      throw 'Must be implemented to return the model associated with this service';
    }
  }, {
    key: 'getModel',
    value: function getModel(attributes) {
      var Model = this.model();
      if (attributes) {
        return new Model(attributes);
      }
      return Model;
    }
  }, {
    key: 'getEndPoints',
    value: function getEndPoints() {
      return this.getModel().prototype.getEndPoints();
    }
  }, {
    key: 'getApiName',
    value: function getApiName() {
      return this.getModel().prototype.apiName();
    }
  }, {
    key: 'getDataMapper',
    value: function getDataMapper() {
      return this._dataMapper;
    }
  }, {
    key: 'findAll',
    value: function findAll() {
      var args = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this.getDataMapper().findAll(this.getModel(), constructFindParams(args));
    }
  }, {
    key: 'findByPk',
    value: function findByPk() {
      var args = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this.getDataMapper().findByPk(this.getModel(), args[this.getModel().prototype.primaryKey()]);
    }
  }, {
    key: 'create',
    value: function create() {
      var args = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var model = this.getModel(args);
      return this.getDataMapper().create(model);
    }
  }, {
    key: 'update',
    value: function update() {
      var args = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var model = this.getModel(args);
      return this.getDataMapper().update(model);
    }
  }, {
    key: 'delete',
    value: function _delete() {
      var args = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var model = this.getModel(args);
      return this.getDataMapper().delete(model);
    }
  }, {
    key: '_runHooks',
    value: function _runHooks(hooks, ignoreError, args, result) {
      var _this2 = this;

      if (!hooks || !hooks.length) {
        return Promise.resolve(true);
      }

      var hook = hooks.shift();

      return util.tryPromise(hook.call(this, args, result)).catch(function (e) {
        if (ignoreError) {
          return false;
        }
        return Promise.reject(e);
      }).then(function () {
        return _this2._runHooks(hooks, ignoreError, args, result);
      });
    }
  }, {
    key: 'execute',
    value: function execute(methodName, args) {
      var _this3 = this;

      var method = this[methodName];

      if (!method) {
        var error = new Error(methodName + ' is not found');
        error.httpCode = error.code = 500;
        return Promise.reject(error);
      }

      var promises = [];

      // Processes before hooks, skips the process when there is a rejection
      var beforeHooks = (this.getClass()._beforeHooks || {})[methodName];
      return this._runHooks(beforeHooks, false, args).then(function () {
        return util.tryPromise(method.call(_this3, args));
      }).then(function (result) {
        // Processes after hooks and ignores rejection
        var afterHooks = (_this3.getClass()._afterHooks || {})[methodName];
        return _this3._runHooks(afterHooks, true, args, result).then(function () {
          return result;
        });
      });
    }

    // Lifecycle methods

    /**
     * This method is called before the execution of the method
     * @param  {String}   methodName method name
     * @param  {Function} fn         the funciton to be executed
     * @return {Promise}
     */

  }], [{
    key: 'before',
    value: function before(methodName, fn) {
      this._beforeHooks = this._beforeHooks || {};
      if (!this._beforeHooks[methodName]) {
        this._beforeHooks[methodName] = [];
      }

      this._beforeHooks[methodName].push(fn);
    }
  }, {
    key: 'clearBeforeHooks',
    value: function clearBeforeHooks() {
      this._beforeHooks = {};
    }

    /**
     * This method is called after the execution of the method
     * @param  {String}   methodName method name
     * @param  {Function} fn         the funciton to be executed
     * @return {Promise}
     */

  }, {
    key: 'after',
    value: function after(methodName, fn) {
      this._afterHooks = this._afterHooks || {};
      if (!this._afterHooks[methodName]) {
        this._afterHooks[methodName] = [];
      }

      this._afterHooks[methodName].push(fn);
    }
  }, {
    key: 'clearAfterHooks',
    value: function clearAfterHooks() {
      this._afterHooks = {};
    }
  }]);

  return Service;
})(Component);

module.exports = Service;