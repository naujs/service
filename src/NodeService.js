'use strict';

var Service = require('./Service')
  , NodeContext = require('./NodeContext');

class NodeService extends Service {
  setContext(context) {
    if (context instanceof NodeContext) {
      this._context = context;
      return this;
    }

    throw 'Context must be an instance of NodeContext';
  }

  getContext() {
    return this._context;
  }
}

module.exports = NodeService;
