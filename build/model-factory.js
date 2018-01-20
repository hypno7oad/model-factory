'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SYMBOLS = undefined;

var _ajv = require('ajv');

var _ajv2 = _interopRequireDefault(_ajv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ajv = new _ajv2.default({ allErrors: true });

/**
 * Create Symbols to separate library props from data/usage props
 */
var C = Symbol('CREATE');
var R = Symbol('READ');
var U = Symbol('UPDATE');
var D = Symbol('DELETE');
var L = Symbol('LIST');

var SCHEMA = Symbol('SCHEMA');
var DATA = Symbol('DATA');

function validationReducer(validations, tuple) {
  validations[tuple[0]] = ajv.compile(tuple[1]);
  return validations;
}

var noCreate = function noCreate() {
  throw new ReferenceError('Create service not implemented');
};
var noRead = function noRead() {
  throw new ReferenceError('Read service not implemented');
};
var noUpdate = function noUpdate() {
  throw new ReferenceError('Update service not implemented');
};
var noDelete = function noDelete() {
  throw new ReferenceError('Delete service not implemented');
};
var noList = function noList() {
  throw new ReferenceError('List service not implemented');
};

function modelFactory(schema) {
  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (schema === undefined) throw new ReferenceError('A schema is required');

  var _config$services = config.services,
      services = _config$services === undefined ? {} : _config$services;
  var _schema$properties = schema.properties,
      properties = _schema$properties === undefined ? {} : _schema$properties;

  var Model = function Model() {
    var _this = this;

    _classCallCheck(this, Model);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _args$ = args[0],
        values = _args$ === undefined ? {} : _args$;


    if (values instanceof Model) values = values[DATA];

    // validate the initial values
    if (!Model.validate(values)) throw new Error(Model.validate.errors[0].message);

    this[DATA] = Object.create(Model.prototype);

    Object.entries(properties).forEach(function (tuple) {
      var key = tuple[0];
      var property = tuple[1];
      var isConst = 'const' in property;
      var definition = {
        enumerable: true,
        configurable: false,
        get: isConst ? function () {
          return property.const;
        } : function () {
          return _this[DATA][key];
        },
        set: function set(value) {
          if (!Model.validations[key](value)) throw new Error(Model.validations[key].errors[0].message);
          _this[DATA][key] = value;
        }
      };

      Object.defineProperty(_this, key, definition);
    });

    Object.entries(values).forEach(function (tuple) {
      return _this[tuple[0]] = tuple[1];
    });
  };

  Model.validations = Object.entries(properties).reduce(validationReducer, {});
  Model.validate = ajv.compile(schema);

  var instantiator = function instantiator(record) {
    return new Model(record);
  };
  Model[C] = services.create instanceof Function ? function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return services.create.apply(undefined, args).then(instantiator);
  } : noCreate;

  Model[R] = services.read instanceof Function ? function () {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    return services.read.apply(undefined, args).then(instantiator);
  } : noRead;

  Model[U] = services.update instanceof Function ? function () {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    return services.update.apply(undefined, args).then(instantiator);
  } : noUpdate;

  Model[D] = services.delete instanceof Function ? function () {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    return services.delete.apply(undefined, args).then(instantiator);
  } : noDelete;

  Model[L] = services.list instanceof Function ? function () {
    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    return services.list.apply(undefined, args).then(function (records) {
      return records.map(instantiator);
    });
  } : noList;

  Model[SCHEMA] = schema;

  Object.entries(properties).forEach(function (tuple) {
    if (tuple[1].default) Model.prototype[tuple[0]] = tuple[1].default;else if ('defaultToNull' in config) Model.prototype[tuple[0]] = null;
  });

  return Model;
}

var SYMBOLS = exports.SYMBOLS = {
  SERVICES: { C: C, R: R, U: U, D: D, L: L },
  SCHEMA: SCHEMA,
  DATA: DATA
};

exports.default = modelFactory;
