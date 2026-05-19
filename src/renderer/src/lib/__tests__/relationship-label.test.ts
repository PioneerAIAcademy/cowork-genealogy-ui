import { describe, it, expect } from 'vitest'
import { parentChildLabel, describeRelationship } from '../relationship-label'
import { patrickFlynnGedcomx } from '../__fixtures__/patrick-flynn'
import type { GedcomxParentChildRelationship, GedcomxCoupleRelationship } from '../schema'

const bio: GedcomxParentChildRelationship = {
  id: 'R1',
  type: 'ParentChild',
  parent: 'I2',
  child: 'I1'
}

const bioExplicit: GedcomxParentChildRelationship = {
  ...bio,
  subtype: 'Biological'
}

const step: GedcomxParentChildRelationship = {
  ...bio,
  subtype: 'Step'
}

const adoptive: GedcomxParentChildRelationship = {
  ...bio,
  subtype: 'Adoptive'
}

describe('parentChildLabel', () => {
  it('omits subtype when absent', () => {
    expect(parentChildLabel(bio, 'Thomas Flynn', 'parent')).toBe('Parent of Thomas Flynn')
    expect(parentChildLabel(bio, 'Patrick Flynn', 'child')).toBe('Child of Patrick Flynn')
  })

  it('omits "Biological" subtype (treated as implicit default)', () => {
    expect(parentChildLabel(bioExplicit, 'Thomas', 'parent')).toBe('Parent of Thomas')
    expect(parentChildLabel(bioExplicit, 'Patrick', 'child')).toBe('Child of Patrick')
  })

  it('renders non-default subtypes with capitalized prefix', () => {
    expect(parentChildLabel(step, 'Bridget Flynn', 'parent')).toBe('Step parent of Bridget Flynn')
    expect(parentChildLabel(adoptive, 'Patrick Flynn', 'child')).toBe(
      'Adoptive child of Patrick Flynn'
    )
  })
})

describe('describeRelationship', () => {
  it('renders a default ParentChild as "parent → child child"', () => {
    expect(describeRelationship(bio, patrickFlynnGedcomx.persons)).toBe(
      'Thomas Flynn → child Patrick Flynn'
    )
  })

  it('includes a non-default subtype between the arrow and "child"', () => {
    const stepBridget: GedcomxParentChildRelationship = {
      id: 'R2',
      type: 'ParentChild',
      parent: 'I3',
      child: 'I1',
      subtype: 'Step'
    }
    expect(describeRelationship(stepBridget, patrickFlynnGedcomx.persons)).toBe(
      'Bridget Flynn → step child Patrick Flynn'
    )
  })

  it('falls back to the id when a person is missing from the array', () => {
    const dangling: GedcomxParentChildRelationship = {
      id: 'R9',
      type: 'ParentChild',
      parent: 'I_UNKNOWN',
      child: 'I1'
    }
    expect(describeRelationship(dangling, patrickFlynnGedcomx.persons)).toBe(
      'I_UNKNOWN → child Patrick Flynn'
    )
  })

  it('renders a Couple as "person1 ⇔ person2"', () => {
    const couple: GedcomxCoupleRelationship = {
      id: 'R3',
      type: 'Couple',
      person1: 'I2',
      person2: 'I3'
    }
    expect(describeRelationship(couple, patrickFlynnGedcomx.persons)).toBe(
      'Thomas Flynn ⇔ Bridget Flynn'
    )
  })
})

describe('fixture exercises new schema fields', () => {
  it('attaches an ARK to Patrick (I1)', () => {
    const patrick = patrickFlynnGedcomx.persons.find((p) => p.id === 'I1')
    expect(patrick?.ark).toMatch(/^https:\/\/familysearch\.org\/ark:/)
  })

  it('carries subtype and notes on the Bridget→Patrick relationship', () => {
    const r2 = patrickFlynnGedcomx.relationships.find((r) => r.id === 'R2')
    expect(r2?.type).toBe('ParentChild')
    if (r2?.type === 'ParentChild') {
      expect(r2.subtype).toBe('Step')
      expect(r2.notes).toBeDefined()
      expect(r2.notes?.length).toBeGreaterThan(0)
    }
  })
})
