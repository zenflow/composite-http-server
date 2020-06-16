import { normalizeCompositeServiceConfig } from '../../src/core/normalizeCompositeServiceConfig'

describe('normalizeCompositeServiceConfig', () => {
  it('throws if cyclic dependency is defined', () => {
    expect(() =>
      normalizeCompositeServiceConfig({
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
