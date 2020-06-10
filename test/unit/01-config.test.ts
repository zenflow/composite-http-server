import { validateAndNormalizeConfig } from '../../src/config'

describe('validateAndNormalizeConfig', () => {
  it('throws if cyclic dependency is defined', () => {
    expect(() =>
      validateAndNormalizeConfig({
        services: {
          a: { dependencies: ['b'], command: '' },
          b: { dependencies: ['c'], command: '' },
          c: { dependencies: ['a'], command: '' },
        },
      })
    ).toThrow(
      'composite-service: Invalid Config: Found cyclic dependency a -> b -> c -> a'
    )
  })
})
