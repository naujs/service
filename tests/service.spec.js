/*eslint max-nested-callbacks:0*/

'use strict';

var Service = require('../').Service
  , PersistedModel = require('@naujs/persisted-model')
  , DataMapper = require('@naujs/data-mapper')
  , util = require('@naujs/util')
  , Promise = util.getPromise();

class DummyModel extends PersistedModel {
  name() {
    return 'dummy';
  }
}

class DummyConnector {}

class DummyService extends Service {
  model() {
    return DummyModel;
  }
}

const DEFAULT_METHODS = [
  'findByPk',
  'findAll',
  'create',
  'update',
  'delete'
];

describe('Service', () => {
  var service;

  beforeEach(() => {
    service = new DummyService(new DummyConnector());

    DEFAULT_METHODS.forEach((method) => {
      spyOn(DataMapper.prototype, method).and.callFake(function() {
        return Promise.resolve({});
      });
    });
  });

  afterEach(() => {
    DEFAULT_METHODS.forEach((method) => {
      DataMapper.prototype[method].calls.reset();
      DataMapper.prototype[method].and.callThrough();
    });
  });

  describe('#execute', () => {
    it('should call method with correct arguments', (done) => {
      service.execute('findAll', {where: {test: 'test'}}).then(() => {
        expect(DataMapper.prototype.findAll.calls.count()).toEqual(1);
        expect(DataMapper.prototype.findAll).toHaveBeenCalledWith(DummyModel, {
          where: {
            test: 'test'
          },
          include: undefined,
          fields: [],
          orders: [],
          limit: undefined,
          offset: undefined
        });
      }, fail).then(done);
    });

    DEFAULT_METHODS.forEach((method) => {
      it(`should call #${method} on data mapper`, (done) => {
        service.execute(method).then(() => {
          expect(DataMapper.prototype[method]).toHaveBeenCalled();
        }, fail).then(done);
      });
    });

    it('should return error when the method is not found', (done) => {
      service.execute('invalid').then(fail, (error) => {
        expect(error.code).toEqual(500);
        expect(error.httpCode).toEqual(500);
      }).then(done);
    });
  });

  describe('.before', () => {
    var before0, before1, calls;

    beforeEach(() => {
      DummyService.clearBeforeHooks();

      before0 = jasmine.createSpy();
      before1 = jasmine.createSpy();
      calls = [];
      DummyService.before('findAll', before0);
      DummyService.before('findAll', before1);
    });

    it('should call before hooks before calling the method', (done) => {
      before0.and.callFake(() => {
        calls.push(0);
        return Promise.resolve(true);
      });

      before1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      DataMapper.prototype.findAll.and.callFake(() => {
        calls.push(2);
        return Promise.resolve({});
      });

      service.execute('findAll', {test: 'test'}).then(() => {
        expect(calls).toEqual([0, 1, 2]);
        expect(before0).toHaveBeenCalledWith({test: 'test'}, undefined);
        expect(before1).toHaveBeenCalledWith({test: 'test'}, undefined);
      }, fail).then(done);
    });

    it('should not call the method when any of the before hooks return error', (done) => {
      before0.and.callFake(() => {
        calls.push(0);
        let error = new Error();
        error.code = 400;
        return Promise.reject(error);
      });

      before1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      DataMapper.prototype.findAll.and.callFake(() => {
        calls.push(2);
        return Promise.resolve({});
      });

      service.execute('findAll', {test: 'test'}).then(fail, (error) => {
        expect(calls).toEqual([0]);
        expect(error.code).toEqual(400);
      }).then(done);
    });

  });

  describe('.after', () => {
    var after0, after1, calls;

    beforeEach(() => {
      DummyService.clearBeforeHooks();

      after0 = jasmine.createSpy();
      after1 = jasmine.createSpy();
      calls = [];
      DummyService.after('findAll', after0);
      DummyService.after('findAll', after1);
    });

    it('should call after hooks after calling the method', (done) => {
      after0.and.callFake(() => {
        calls.push(0);
        return Promise.resolve(true);
      });

      after1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      DataMapper.prototype.findAll.and.callFake(() => {
        calls.push(2);
        return Promise.resolve(3);
      });

      service.execute('findAll', {test: 'test'}).then(() => {
        expect(calls).toEqual([2, 0, 1]);
        expect(after0).toHaveBeenCalledWith({test: 'test'}, 3);
        expect(after1).toHaveBeenCalledWith({test: 'test'}, 3);
      }, fail).then(done);
    });

    it('should ignore error during the execution of after hooks', (done) => {
      after0.and.callFake(() => {
        calls.push(0);
        let error = new Error();
        error.code = 400;
        return Promise.reject(error);
      });

      after1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      DataMapper.prototype.findAll.and.callFake(() => {
        calls.push(2);
        return Promise.resolve(3);
      });

      service.execute('findAll', {test: 'test'}).then(() => {
        expect(calls).toEqual([2, 0, 1]);
        expect(after0).toHaveBeenCalledWith({test: 'test'}, 3);
        expect(after1).toHaveBeenCalledWith({test: 'test'}, 3);
      }, fail).then(done);
    });
  });

});
