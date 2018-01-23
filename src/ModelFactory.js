import Ajv from 'ajv'
const ajv = new Ajv({allErrors: true})

// SERVICES are asyncronous and attached to the Model class
export const SERVICES = Symbol('SERVICES')
// These are special services, and will be exposed directly on the Model
export const C = Symbol('CREATE')
export const R = Symbol('READ')
export const U = Symbol('UPDATE')
export const D = Symbol('DELETE')
export const L = Symbol('LIST')
// METHODS are syncronous and bound to each Model instance
export const METHODS = Symbol('METHODS')
export const SCHEMA = Symbol('SCHEMA')
// The raw data behind our propertyDefinition proxies
export const DATA = Symbol('DATA')
// The defaults for every instance
export const DEFAULTS = Symbol('DEFAULTS')

function validationReducer (validations, keyValue) {
  const [key, value] = keyValue
  validations[key] = ajv.compile(value)
  return validations
}

function modelFactory (schema, config = {}) {
  if (schema === undefined) throw new ReferenceError('A schema is required')

  const {
    services = {},
    methods = {},
    defaultToUndefined,
    // This is a function used to transform and return errors instead of throwing Errors
    onValidationErrors,
    enforceImmutableData
  } = config

  class Model {
    constructor (...args) {
      let [values = {}] = args

      // This allows for copying/duplication of instances
      if (values instanceof Model) values = values[DATA]

      // validate the initial values against the Model's schema
      if (!Model.validate(values)) throw new Error(Model.validate.errors[0].message)

      // Expose the raw data
      this[DATA] = Object.create(Model[DEFAULTS])

      // If there are any methods in the configuration, then bind this to each instance
      this[METHODS] = Object.entries(methods).reduce((methods, keyValue) => {
        const [key, value] = keyValue
        methods[key] = value.bind(this)
        return methods
      }, {})

      // Apply all initial values...
      Object.entries(values).forEach(keyValue => {
        const [key, value] = keyValue
        return (this[key] = value)
      })
    }
  }
  // Expose the schema through each instance
  Model.prototype[SCHEMA] = schema

  const {properties = {}} = schema
  Model.validations = Object.entries(properties).reduce(validationReducer, {})
  Model.validate = ajv.compile(schema)

  Object.entries(properties).forEach(keyValue => {
    const [key, property] = keyValue
    const isConst = 'const' in property
    const definition = {
      enumerable: true,
      configurable: false,
      get: isConst
        ? () => property.const
        // We can't use arrow functions here because "this" would be set to the model-factory module object
        // We can't use a pre-defined named function either, because the function relies on the closed over 'key' variable
        : function () {
          return this[DATA][key]
        },
      // We can't use arrow functions here because "this" would be set to the model-factory module object
      // We can't use a pre-defined named function either, because the function relies on the closed over 'key' variable
      set: function (value) {
        if (!Model.validations[key](value)) {
          if (onValidationErrors) return onValidationErrors(Model.validations[key].errors)
          throw new Error(Model.validations[key].errors[0].message)
        }

        // If immutability is configured, then always replace this[DATA] with a new object
        /* This can be useful in systems like React & Angular, where optimizations can occur
           by dirty checking by identity (===) vs deep equality checks */
        if (enforceImmutableData) {
          // Create a new object
          const newData = Object.create(Model[DEFAULTS])
          // Apply all current values to it
          Object.assign(newData, this[DATA])
          // Set the newValue for the intended property
          newData[key] = value
          // Replace the old data object with the new one
          this[DATA] = newData
        } else {
          this[DATA][key] = value
        }
      }
    }

    Object.defineProperty(Model.prototype, key, definition)
  })

  Model[DEFAULTS] = Object.entries(properties).reduce((defaults, keyValue) => {
    const [key, value] = keyValue
    if (value.default) defaults[key] = value.default
    else defaults[key] = (defaultToUndefined) ? undefined : null
    return defaults
  }, {})

  // If the response is an array, then apply the instantiator across all elements of the array
  // For non-Array responses, return a new Model using the response as the values parameter
  const instantiator = response => (response instanceof Array) ? response.map(instantiator) : new Model(response)

  /* Wrap every service call, so that they run with the Model as its context
      and all responses being used to instantiate new instances of the Model */
  Model[SERVICES] = Object.entries(services).reduce((services, keyValue) => {
    const [key, value] = keyValue
    services[key] = (...args) => value.apply(Model, args).then(instantiator)
    return services
  }, {})

  // Expose any defined CRUDL services at a top level
  if (Model[SERVICES].create) Model[C] = Model[SERVICES].create
  if (Model[SERVICES].read) Model[R] = Model[SERVICES].read
  if (Model[SERVICES].update) Model[U] = Model[SERVICES].update
  if (Model[SERVICES].delete) Model[D] = Model[SERVICES].delete
  if (Model[SERVICES].list) Model[L] = Model[SERVICES].list

  Model[SCHEMA] = schema

  return Model
}

export default modelFactory
