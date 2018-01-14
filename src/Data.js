import Ajv from 'ajv'
const ajv = new Ajv({allErrors: true})

/**
 * Create Symbols to separate library props from data/usage props
 */
const C = Symbol('CREATE')
const R = Symbol('READ')
const U = Symbol('UPDATE')
const D = Symbol('DELETE')
const S = Symbol('SEARCH')

const SCHEMA = Symbol('SCHEMA')
const DATA = Symbol('DATA')
const noop = () => undefined

function validationReducer (validations, tuple) {
  validations[tuple[0]] = ajv.compile(tuple[1])
  return validations
}

export function factory (config) {
  const {
    constructor = noop,
    schema = {},
    services = {}
  } = config
  const {properties = {}} = schema

  class Datum {
    constructor (values = {}) {
      if (constructor) constructor.apply(values)

      // validate the initial values
      if (!Datum.validate(values)) throw new Error(Datum.validate.errors[0].message)

      this[DATA] = Object.create(Datum.prototype)

      Object.entries(properties).forEach(tuple => {
        const key = tuple[0]
        const property = tuple[1]
        const isConst = 'const' in property
        const definition = {
          enumerable: true,
          configurable: false,
          get: isConst ? () => property.const : () => this[DATA][key],
          set: (value) => {
            if (!Datum.validations[key](value)) throw new Error(Datum.validations[key].errors[0].message)
            this[DATA][key] = value
          }
        }

        Object.defineProperty(this, key, definition)
      })

      Object.entries(values).forEach(tuple => (this[tuple[0]] = tuple[1]))
      console.log('not "Object.keys(values).forEach(key => (this[key] = values[key]))"')
    }

    static validations = Object.entries(properties).reduce(validationReducer, {})
    static validate = ajv.compile(schema)
  }

  Datum.prototype[C] = services.create || (() => { throw new ReferenceError('Create service not implemented') })
  Datum.prototype[R] = services.read || (() => { throw new ReferenceError('Read service not implemented') })
  Datum.prototype[U] = services.update || (() => { throw new ReferenceError('Update service not implemented') })
  Datum.prototype[D] = services.delete || (() => { throw new ReferenceError('Delete service not implemented') })
  Datum.prototype[S] = services.search || (() => { throw new ReferenceError('Search service not implemented') })

  Datum.prototype[SCHEMA] = config.schema

  Object.entries(properties).forEach(tuple => {
    if (tuple[1].default) Datum.prototype[tuple[0]] = tuple[1].default
    else if ('defaultToNull' in config) Datum.prototype[tuple[0]] = null
  })

  return Datum
}

export const SYMBOLS = {
  SERVICES: {C, R, U, D, S},
  SCHEMA: SCHEMA,
  DATA: DATA
}
