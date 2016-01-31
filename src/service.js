'use strict';

var Component = require('@naujs/component')
  , PersistedModel = require('@naujs/persisted-model')
  , DataMapper = require('@naujs/data-mapper')
  , util = require('@naujs/util')
  , Promise = util.getPromise();

var _ = require('lodash')
  , express = require('express');

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

class Service extends Component {
  constructor(connector, context) {
    super();
    this._dataMapper = new DataMapper(connector);
    this._context = context;
  }

  model() {
    throw 'Must be implemented to return the model associated with this service';
  }

  getModel(attributes) {
    var Model = this.model();
    if (attributes) {
      return new Model(attributes);
    }
    return Model;
  }

  getEndPoints() {
    return this.getModel().prototype.getEndPoints();
  }

  getApiName() {
    return this.getModel().prototype.apiName();
  }

  getDataMapper() {
    return this._dataMapper;
  }

  findAll(args = {}) {
    return this.getDataMapper().findAll(
      this.getModel(),
      constructFindParams(args)
    );
  }

  findByPk(args = {}) {
    return this.getDataMapper().findByPk(
      this.getModel(),
      args[this.getModel().prototype.primaryKey()]
    );
  }

  create(args = {}) {
    let model = this.getModel(args);
    return this.getDataMapper().create(model);
  }

  update(args = {}) {
    let model = this.getModel(args);
    return this.getDataMapper().update(model);
  }

  delete(args = {}) {
    let model = this.getModel(args);
    return this.getDataMapper().delete(model);
  }

  _runHooks(hooks, ignoreError, args, result) {
    if (!hooks || !hooks.length) {
      return Promise.resolve(true);
    }

    let hook = hooks.shift();

    return util.tryPromise(hook.call(this, args, result)).catch((e) => {
      if (ignoreError) {
        return false;
      }
      return Promise.reject(e);
    }).then(() => {
      return this._runHooks(hooks, ignoreError, args, result);
    });
  }

  execute(methodName, args) {
    let method = this[methodName];

    if (!method) {
      let error = new Error(`${methodName} is not found`);
      error.httpCode = error.code = 500;
      return Promise.reject(error);
    }

    let promises = [];

    // Processes before hooks, skips the process when there is a rejection
    let beforeHooks = (this.getClass()._beforeHooks || {})[methodName];
    return this._runHooks(beforeHooks, false, args).then(() => {
      return util.tryPromise(method.call(this, args));
    }).then((result) => {
      // Processes after hooks and ignores rejection
      let afterHooks = (this.getClass()._afterHooks || {})[methodName];
      return this._runHooks(afterHooks, true, args, result).then(() => {
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
  static before(methodName, fn) {
    this._beforeHooks = this._beforeHooks || {};
    if (!this._beforeHooks[methodName]) {
      this._beforeHooks[methodName] = [];
    }

    this._beforeHooks[methodName].push(fn);
  }

  static clearBeforeHooks() {
    this._beforeHooks = {};
  }

  /**
   * This method is called after the execution of the method
   * @param  {String}   methodName method name
   * @param  {Function} fn         the funciton to be executed
   * @return {Promise}
   */
  static after(methodName, fn) {
    this._afterHooks = this._afterHooks || {};
    if (!this._afterHooks[methodName]) {
      this._afterHooks[methodName] = [];
    }

    this._afterHooks[methodName].push(fn);
  }

  static clearAfterHooks() {
    this._afterHooks = {};
  }
}

module.exports = Service;
