/*eslint max-nested-callbacks:0*/

'use strict';

var express = require('express')
  , app = null
  , request = require('supertest')
  , _ = require('lodash')
  , util = require('@naujs/util')
  , PersistedModel = require('@naujs/persisted-model')
  , NodeService = require('../').NodeService
  , ExpressApi = require('../').ExpressApi
  , Promise = util.getPromise()
  , Component = require('@naujs/component');

class DummyModel extends PersistedModel {
  modelName() {
    return 'dummy';
  }

  attributes() {
    return {
      'name': {
        type: DummyModel.Types.string
      }
    };
  }
}

class DummyConnector extends Component {
  find() {}
  findAll() {}
  findByPk() {}
  create() {}
  update() {}
  delete() {}
}

class DummyService extends NodeService {
  model() {
    return DummyModel;
  }
}

function sendRequest(type, url, data) {
  data = data || {};
  return new Promise((resolve, reject) => {
    request(app)[type](url).query(data).expect('Content-Type', /json/).end((error, res) => {
      if (error) return reject(error);
      if (res.status >= 300) return reject(res);
      resolve(res);
    });
  });
}

var helpers = {
  get: function(url, data) {
    return sendRequest('get', url, data);
  },

  post: function(url, data) {
    return sendRequest('post', url, data);
  },

  put: function(url, data) {
    return sendRequest('put', url, data);
  },

  del: function(url, data) {
    return sendRequest('del', url, data);
  }
};

var expectedError = new Error('test');
expectedError.code = 40000;
expectedError.statusCode = 400;
var specs = [
  {
    type: 'get',
    path: '/api/dummy',
    expectedMethod: 'findAll',
    expectedData: [
      {
        id: 1
      },
      {
        id: 2
      }
    ]
  },
  {
    type: 'get',
    path: '/api/dummy/1',
    expectedMethod: 'find',
    expectedArgs: ['dummy', {where: {id: 1}}, {}],
    expectedData: {
      id: 1
    }
  },
  {
    type: 'post',
    path: '/api/dummy',
    data: {
      name: 'test'
    },
    expectedMethod: 'create',
    expectedArgs: ['dummy', {name: 'test'}, {}],
    expectedData: {
      id: 1,
      name: 'test'
    }
  },
  {
    type: 'put',
    path: '/api/dummy/1',
    data: {
      name: 'test'
    },
    expectedMethod: 'update',
    expectedArgs: ['dummy', {where: {id: 1}}, {name: 'test'}, {}],
    expectedData: {
      id: 1,
      name: 'test'
    }
  },
  {
    type: 'del',
    path: '/api/dummy/1',
    expectedMethod: 'delete',
    expectedArgs: ['dummy', {where: {id: 1}}, {}],
    expectedData: {
      id: 1
    }
  }
];

describe('ExpressApi', () => {
  var connector;
  beforeEach(() => {
    app = express();
    connector = new DummyConnector();
    ExpressApi.app(app)
              .connector(connector)
              .apiRoot('/api')
              .build(DummyService)
              .done();
  });

  describe('Router', () => {
    it('should have all the default routes', () => {
      var routes = _.chain(app._router.stack[2].handle.stack).map(function(stack) {
        return stack.route;
      }).value();

      expect(routes.length).toEqual(5);

      expect(routes[0].path).toEqual('/dummy/');
      expect(routes[1].path).toEqual('/dummy/:id');
      expect(routes[2].path).toEqual('/dummy/');
      expect(routes[3].path).toEqual('/dummy/:id');
      expect(routes[4].path).toEqual('/dummy/:id');

      expect(routes[0].methods.get).toBe(true);
      expect(routes[1].methods.get).toBe(true);
      expect(routes[2].methods.post).toBe(true);
      expect(routes[3].methods.put).toBe(true);
      expect(routes[4].methods.delete).toBe(true);
    });
  });

  describe('REST', () => {
    var deferred;

    _.each(specs, (spec) => {
      describe(spec.type.toUpperCase() + ' ' + spec.path, () => {
        beforeEach(() => {
          deferred = util.defer();
          spyOn(connector, spec.expectedMethod).and.returnValue(deferred.promise);
        });

        it('should call #' + spec.expectedMethod, () => {
          deferred.resolve(spec.expectedData);

          return helpers[spec.type](spec.path, spec.data).then((res) => {
            expect(res.status).toEqual(200);
            expect(res.body.data).toEqual(spec.expectedData);
            expect(res.body.success).toBe(true);
            expect(res.body.error).toBe(null);

            if (spec.expectedArgs) {
              expect(connector[spec.expectedMethod]).toHaveBeenCalledWith(...spec.expectedArgs);
            } else {
              expect(connector[spec.expectedMethod]).toHaveBeenCalled();
            }
          });
        });

        it('should return correct error', () => {
          deferred.reject(expectedError);

          return helpers[spec.type](spec.path, spec.data).then(fail, (res) => {
            expect(res.status).toEqual(400);
            var error = res.body.error;
            expect(error.code).toEqual(40000);
            expect(error.message).toEqual(expectedError.message);
            expect(res.body.data).toEqual(null);
            expect(res.body.success).toBe(false);
          });
        });
      });
    });
  });
});
