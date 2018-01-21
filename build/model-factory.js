'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SYMBOLS = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

// SERVICES are asyncronous and attached to the Model class
var SERVICES = Symbol('SERVICES');
// METHODS are syncronous and bound to each Model instance
var METHODS = Symbol('METHODS');
var SCHEMA = Symbol('SCHEMA');
// The raw data behind our propertyDefinition proxies
var DATA = Symbol('DATA');

function validationReducer(validations, keyValue) {
  var _keyValue = _slicedToArray(keyValue, 2),
      key = _keyValue[0],
      value = _keyValue[1];

  validations[key] = ajv.compile(value);
  return validations;
}

function modelFactory(schema) {
  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (schema === undefined) throw new ReferenceError('A schema is required');

  var _config$services = config.services,
      services = _config$services === undefined ? {} : _config$services,
      _config$methods = config.methods,
      methods = _config$methods === undefined ? {} : _config$methods,
      defaultToUndefined = config.defaultToUndefined,
      onValidationErrors = config.onValidationErrors,
      isImmutable = config.isImmutable;
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

    // This allows for copying/duplication of instances

    if (values instanceof Model) values = values[DATA];

    // validate the initial values against the Model's schema
    if (!Model.validate(values)) throw new Error(Model.validate.errors[0].message);

    // Expose the raw data
    this[DATA] = Object.create(Model.prototype);
    // Expose the schema throgh each instance
    this[SCHEMA] = schema;

    // If there are any methods in the configuration, then bind this to each instance
    this[METHODS] = Object.entries(methods).reduce(function (methods, keyValue) {
      var _keyValue2 = _slicedToArray(keyValue, 2),
          key = _keyValue2[0],
          value = _keyValue2[1];

      methods[key] = value.bind(_this);
      return methods;
    }, {});

    Object.entries(properties).forEach(function (keyValue) {
      var _keyValue3 = _slicedToArray(keyValue, 2),
          key = _keyValue3[0],
          property = _keyValue3[1];

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
          if (!Model.validations[key](value)) {
            if (onValidationErrors) return onValidationErrors(Model.validations[key].errors);
            throw new Error(Model.validations[key].errors[0].message);
          }

          // If immutability is configured, then always replace this[DATA} with a new object
          /* This can be useful in systems like React & Angular, where optimizations can occur
             by dirty checking by identity (===) vs deep equality checks */
          if (isImmutable) {
            var _values = _extends({}, _this[DATA]);
            _values[key] = value;
            _this[DATA] = _values;
          } else {
            _this[DATA][key] = value;
          }
        }
      };

      Object.defineProperty(_this, key, definition);
    });

    Object.entries(values).forEach(function (keyValue) {
      var _keyValue4 = _slicedToArray(keyValue, 2),
          key = _keyValue4[0],
          value = _keyValue4[1];

      return _this[key] = value;
    });
  };

  Model.validations = Object.entries(properties).reduce(validationReducer, {});
  Model.validate = ajv.compile(schema);

  // If the response is an array, then apply the instantiator across all elements of the array
  // For non-Array responses, return a new Model using the response as the values parameter
  var instantiator = function instantiator(response) {
    return response instanceof Array ? response.map(instantiator) : new Model(response);
  };

  /* Wrap every service call, so that they run with the Model as its context
      and all responses being used to instantiate new instances of the Model */
  Model[SERVICES] = Object.entries(services).reduce(function (services, keyValue) {
    var _keyValue5 = _slicedToArray(keyValue, 2),
        key = _keyValue5[0],
        value = _keyValue5[1];

    services[key] = function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return value.apply(Model, args).then(instantiator);
    };
  }, {});

  // Expose any defined CRUDL services at a top level
  Model[C] = Model[SERVICES].create;
  Model[R] = Model[SERVICES].read;
  Model[U] = Model[SERVICES].update;
  Model[D] = Model[SERVICES].delete;
  Model[L] = Model[SERVICES].list;

  Model[SCHEMA] = schema;

  Object.entries(properties).forEach(function (keyValue) {
    var _keyValue6 = _slicedToArray(keyValue, 2),
        key = _keyValue6[0],
        value = _keyValue6[1];

    if (value.default) Model.prototype[key] = value.default;else Model.prototype[key] = defaultToUndefined ? undefined : null;
  });

  return Model;
}

var SYMBOLS = exports.SYMBOLS = {
  C: C,
  R: R,
  U: U,
  D: D,
  L: L,
  SERVICES: SERVICES,
  METHODS: METHODS,
  SCHEMA: SCHEMA,
  DATA: DATA
};

exports.default = modelFactory;
