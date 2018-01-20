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

const SCHEMA = Symbol('SCHEMA')
const DATA = Symbol('DATA')

function validationReducer (validations, tuple) {
  validations[tuple[0]] = ajv.compile(tuple[1])
  return validations
}

const noCreate = () => { throw new ReferenceError('Create service not implemented') }
const noRead = () => { throw new ReferenceError('Read service not implemented') }
const noUpdate = () => { throw new ReferenceError('Update service not implemented') }
const noDelete = () => { throw new ReferenceError('Delete service not implemented') }
const noList = () => { throw new ReferenceError('List service not implemented') }

function modelFactory (schema, config = {}) {
  const {services = {}} = config
  const {properties = {}} = schema

  if (schema === undefined) throw new ReferenceError('A schema is required')

  class Model {
    constructor (...args) {
      let [values] = args

      if (values instanceof Model) values = values[DATA]

      // validate the initial values
      if (!Model.validate(values)) throw new Error(Model.validate.errors[0].message)

      this[DATA] = Object.create(Model.prototype)

      Object.entries(properties).forEach(tuple => {
        const key = tuple[0]
        const property = tuple[1]
        const isConst = 'const' in property
        const definition = {
          enumerable: true,
          configurable: false,
          get: isConst ? () => property.const : () => this[DATA][key],
          set: (value) => {
            if (!Model.validations[key](value)) throw new Error(Model.validations[key].errors[0].message)
            this[DATA][key] = value
          }
        }

        Object.defineProperty(this, key, definition)
      })

      Object.entries(values).forEach(tuple => (this[tuple[0]] = tuple[1]))
    }
  }

  Model.validations = Object.entries(properties).reduce(validationReducer, {})
  Model.validate = ajv.compile(schema)

  const instantiator = record => new Model(record)
  Model[C] = (services.create instanceof Function)
    ? (...args) => services.create.apply(undefined, args).then(instantiator)
    : noCreate

  Model[R] = (services.read instanceof Function)
    ? (...args) => services.read.apply(undefined, args).then(instantiator)
    : noRead

  Model[U] = (services.update instanceof Function)
    ? (...args) => services.update.apply(undefined, args).then(instantiator)
    : noUpdate

  Model[D] = (services.delete instanceof Function)
    ? (...args) => services.delete.apply(undefined, args).then(instantiator)
    : noDelete

  Model[L] = (services.list instanceof Function)
    ? (...args) => services.list.apply(undefined, args).then(records => records.map(instantiator))
    : noList

  Model[SCHEMA] = config.schema

  Object.entries(properties).forEach(tuple => {
    if (tuple[1].default) Model.prototype[tuple[0]] = tuple[1].default
    else if ('defaultToNull' in config) Model.prototype[tuple[0]] = null
  })

  return Model
}

export const SYMBOLS = {
  SERVICES: {C, R, U, D, L},
  SCHEMA: SCHEMA,
  DATA: DATA
}

export default modelFactory
