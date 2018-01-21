import Ajv from 'ajv'
const ajv = new Ajv({allErrors: true})

/**
 * Create Symbols to separate library props from data/usage props
 */
const C = Symbol('CREATE')
const R = Symbol('READ')
const U = Symbol('UPDATE')
const D = Symbol('DELETE')
const L = Symbol('LIST')

// SERVICES are asyncronous
const SERVICES = Symbol('SERVICES')
// METHODS are syncronous
const METHODS = Symbol('METHODS')
const SCHEMA = Symbol('SCHEMA')
// The raw data behind our propertyDefinition proxies
const DATA = Symbol('DATA')

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
    isImmutable
  } = config
  const {properties = {}} = schema

  class Model {
    constructor (...args) {
      let [values = {}] = args

      // This allows for copying/duplication of instances
      if (values instanceof Model) values = values[DATA]

      // validate the initial values against the Model's schema
      if (!Model.validate(values)) throw new Error(Model.validate.errors[0].message)

      // Expose the raw data
      this[DATA] = Object.create(Model.prototype)
      // Expose the schema throgh each instance
      this[SCHEMA] = schema

      // If there are any methods in the configuration, then bind this to each instance
      Object.entries(methods, keyValue => {
        const [key, value] = keyValue
        this[METHODS][key] = value.bind(this)
      })

      Object.entries(properties).forEach(keyValue => {
        const [key, property] = keyValue
        const isConst = 'const' in property
        const definition = {
          enumerable: true,
          configurable: false,
          get: isConst ? () => property.const : () => this[DATA][key],
          set: (value) => {
            if (!Model.validations[key](value)) {
              if (onValidationErrors) return onValidationErrors(Model.validations[key].errors)
              throw new Error(Model.validations[key].errors[0].message)
            }

            // If immutability is configured, then always return a new instance with the desired changes
            /* This can be useful in systems like React & Angular, where optimizations can occur
               by dirty checking by identity (===) vs deep equality checks */
            if (isImmutable) {
              const values = {...this[DATA]}
              values[key] = value
              return new Model(values)
            }

            this[DATA][key] = value
          }
        }

        Object.defineProperty(this, key, definition)
      })

      Object.entries(values).forEach(keyValue => {
        const [key, value] = keyValue
        return (this[key] = value)
      })
    }
  }

  Model.validations = Object.entries(properties).reduce(validationReducer, {})
  Model.validate = ajv.compile(schema)

  // If the response is an array, then apply the instantiator across all elements of the array
  // For non-Array responses, return a new Model using the response as the values parameter
  const instantiator = response => (response instanceof Array) ? response.map(instantiator) : new Model(response)

  /* Wrap every service call, so that they run with the Model as its context
      and all responses being used to instantiate new instances of the Model */
  Object.entries(services, keyValue => {
    const [key, value] = keyValue
    Model[SERVICES][key] = (...args) => value.apply(Model, args).then(instantiator)
  })

  // Expose any defined CRUDL services at a top level
  Model[C] = Model[SERVICES].create
  Model[R] = Model[SERVICES].read
  Model[U] = Model[SERVICES].update
  Model[D] = Model[SERVICES].delete
  Model[L] = Model[SERVICES].list

  Model[SCHEMA] = schema

  Object.entries(properties).forEach(keyValue => {
    const [key, value] = keyValue
    if (value.default) Model.prototype[key] = value.default
    else Model.prototype[key] = (defaultToUndefined) ? undefined : null
  })

  return Model
}

export const SYMBOLS = {
  SERVICES: {C, R, U, D, L},
  SCHEMA: SCHEMA,
  DATA: DATA
}

export default modelFactory
