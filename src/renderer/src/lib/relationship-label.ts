import type { GedcomxPerson, GedcomxRelationship, GedcomxParentChildRelationship } from './schema'
import { getPreferredName } from './schema'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Treat "Biological" as the implicit/default subtype — don't include it in display strings.
function visibleSubtype(rel: GedcomxParentChildRelationship): string | null {
  return rel.subtype && rel.subtype !== 'Biological' ? rel.subtype.toLowerCase() : null
}

export function parentChildLabel(
  rel: GedcomxParentChildRelationship,
  relativeName: string,
  role: 'parent' | 'child'
): string {
  const subtype = visibleSubtype(rel)
  if (role === 'parent') {
    return subtype
      ? `${capitalize(subtype)} parent of ${relativeName}`
      : `Parent of ${relativeName}`
  }
  return subtype ? `${capitalize(subtype)} child of ${relativeName}` : `Child of ${relativeName}`
}

export function describeRelationship(rel: GedcomxRelationship, persons: GedcomxPerson[]): string {
  const nameOf = (id: string): string => {
    const p = persons.find((x) => x.id === id)
    return p ? getPreferredName(p) : id
  }
  if (rel.type === 'ParentChild') {
    const subtype = visibleSubtype(rel)
    const prefix = subtype ? `${subtype} ` : ''
    return `${nameOf(rel.parent)} → ${prefix}child ${nameOf(rel.child)}`
  }
  return `${nameOf(rel.person1)} ⇔ ${nameOf(rel.person2)}`
}
