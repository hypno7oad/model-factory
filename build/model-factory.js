'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULTS = exports.ORIGINAL = exports.DATA = exports.SCHEMA = exports.METHODS = exports.L = exports.D = exports.U = exports.R = exports.C = exports.SERVICES = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _ajv = require('ajv');

var _ajv2 = _interopRequireDefault(_ajv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ajv = new _ajv2.default({ allErrors: true });

// SERVICES are asyncronous and attached to the Model class
var SERVICES = exports.SERVICES = Symbol('SERVICES');
// These are special services, and will be exposed directly on the Model
var C = exports.C = Symbol('CREATE');
var R = exports.R = Symbol('READ');
var U = exports.U = Symbol('UPDATE');
var D = exports.D = Symbol('DELETE');
var L = exports.L = Symbol('LIST');
// METHODS are syncronous and bound to each Model instance
var METHODS = exports.METHODS = Symbol('METHODS');
var SCHEMA = exports.SCHEMA = Symbol('SCHEMA');
// The raw data behind our propertyDefinition proxies
var DATA = exports.DATA = Symbol('DATA');
// This is the first DATA object, which is useful when comparing if changes have been made
var ORIGINAL = exports.ORIGINAL = Symbol('ORIGINAL');
// The defaults for every instance
var DEFAULTS = exports.DEFAULTS = Symbol('DEFAULTS');

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
      onValidationErrors = config.onValidationErrors;

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

    // If there are any methods in the configuration, then bind each method to this instance
    this[METHODS] = Object.entries(methods instanceof Function ? methods(values, schema, config) : methods).reduce(function (methods, keyValue) {
      var _keyValue2 = _slicedToArray(keyValue, 2),
          key = _keyValue2[0],
          value = _keyValue2[1];

      methods[key] = value.bind(_this);
      return methods;
    }, {});

    // Expose the raw data & keep a local reference to the original
    // This is useful for checking if data has changed
    this[ORIGINAL] = this[DATA] = Object.create(Model[DEFAULTS]);
    Object.assign(this[ORIGINAL], values);

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
        }
        // We can't use arrow functions here because "this" would be set to the model-factory module object
        // We can't use a pre-defined named function either, because the function relies on the closed over 'key' variable
        : function () {
          return this[DATA][key];
        },
        // We can't use arrow functions here because "this" would be set to the model-factory module object
        // We can't use a pre-defined named function either, because the function relies on the closed over 'key' variable
        set: function set(value) {
          if (!Model.validations[key](value)) {
            if (onValidationErrors) return onValidationErrors(Model.validations[key].errors);
            throw new Error('"' + key + '" ' + Model.validations[key].errors[0].message);
          }

          // If always replace this[DATA] with a new object.
          // Immutability enables quick shallow checks to see if the data has changed
          // e.g. this[ORIGINAL] === this[DATA]
          // This can also be used by systems like Angular and React

          // Create a new object
          var newData = Object.create(Model[DEFAULTS]);
          // Apply all current values to it
          Object.assign(newData, this[DATA]);
          // Set the newValue for the intended property
          newData[key] = value;
          // Replace the old data object with the new one
          this[DATA] = newData;
        }
      };

      Object.defineProperty(_this, key, definition);
    });
  };
  // Expose the schema through each instance


  Model.prototype[SCHEMA] = schema;

  var _schema$properties = schema.properties,
      properties = _schema$properties === undefined ? {} : _schema$properties;

  Model.validations = Object.entries(properties).reduce(validationReducer, {});
  Model.validate = ajv.compile(schema);

  Model[DEFAULTS] = Object.entries(properties).reduce(function (defaults, keyValue) {
    var _keyValue4 = _slicedToArray(keyValue, 2),
        key = _keyValue4[0],
        value = _keyValue4[1];

    if (value.default) defaults[key] = value.default;else defaults[key] = defaultToUndefined ? undefined : null;
    return defaults;
  }, {});

  // If the response is an array, then apply the instantiator across all elements of the array
  // For non-Array responses, return a new Model using the response as the values parameter
  var instantiator = function instantiator(response) {
    return response instanceof Array ? response.map(instantiator) : new Model(response);
  };

  /* Wrap every service call, so that they run with the Model as its context
      and all responses being used to instantiate new instances of the Model */
  Model[SERVICES] = Object.entries(services instanceof Function ? services(schema, config) : services).reduce(function (services, keyValue) {
    var _keyValue5 = _slicedToArray(keyValue, 2),
        key = _keyValue5[0],
        value = _keyValue5[1];

    services[key] = function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return value.apply(Model, args).then(instantiator);
    };
    return services;
  }, {});

  // Expose any defined CRUDL services at a top level
  if (Model[SERVICES].create) Model[C] = Model[SERVICES].create;
  if (Model[SERVICES].read) Model[R] = Model[SERVICES].read;
  if (Model[SERVICES].update) Model[U] = Model[SERVICES].update;
  if (Model[SERVICES].delete) Model[D] = Model[SERVICES].delete;
  if (Model[SERVICES].list) Model[L] = Model[SERVICES].list;

  Model[SCHEMA] = schema;

  return Model;
}

exports.default = modelFactory;
