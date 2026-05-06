import { useMemo } from 'react'
import { useResearchData } from '../../contexts/ResearchDataContext'
import StatusBadge from '../shared/StatusBadge'
import PersonCard from '../shared/PersonCard'
import type { GedcomxPerson, GedcomxRelationship } from '../../lib/schema'
import { getPreferredName } from '../../lib/schema'
import styles from './ProjectOverview.module.css'

function deriveRelationship(
  personId: string,
  subjectIds: string[],
  relationships: GedcomxRelationship[],
  persons: GedcomxPerson[]
): string | undefined {
  for (const rel of relationships) {
    if (rel.type === 'ParentChild') {
      if (rel.child === personId && subjectIds.includes(rel.parent)) {
        const parent = persons.find((p) => p.id === rel.parent)
        return parent ? `Child of ${getPreferredName(parent)}` : 'Child'
      }
      if (rel.parent === personId && subjectIds.includes(rel.child)) {
        const child = persons.find((p) => p.id === rel.child)
        return child ? `Parent of ${getPreferredName(child)}` : 'Parent'
      }
      if (subjectIds.includes(rel.parent) && rel.child === personId) {
        return 'Child'
      }
      if (subjectIds.includes(rel.child) && rel.parent === personId) {
        return 'Parent'
      }
    }
    if (rel.type === 'Couple') {
      if (rel.person1 === personId && subjectIds.includes(rel.person2)) {
        return 'Spouse'
      }
      if (rel.person2 === personId && subjectIds.includes(rel.person1)) {
        return 'Spouse'
      }
    }
  }
  return undefined
}

export default function ProjectOverview(): React.JSX.Element {
  const { research, gedcomx } = useResearchData()
  const project = research?.project

  const { subjectPersons, otherPersons } = useMemo(() => {
    if (!gedcomx) return { subjectPersons: [] as GedcomxPerson[], otherPersons: [] as { person: GedcomxPerson; relationship?: string }[] }

    const subjectIds = project?.subject_person_ids ?? []
    const subjects = subjectIds
      .map((id) => gedcomx.persons.find((p) => p.id === id))
      .filter((p): p is GedcomxPerson => !!p)

    const others = gedcomx.persons
      .filter((p) => !subjectIds.includes(p.id))
      .map((p) => ({
        person: p,
        relationship: deriveRelationship(p.id, subjectIds, gedcomx.relationships, gedcomx.persons)
      }))

    return { subjectPersons: subjects, otherPersons: others }
  }, [gedcomx, project])

  if (!project) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project Overview</h2>
        <p className={styles.notIdentified}>No project data loaded.</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Project Overview</h2>

      <p className={styles.objective}>{project.objective}</p>

      <div className={styles.meta}>
        <StatusBadge value={project.status} />
        <span>Created {project.created}</span>
        <span>Updated {project.updated}</span>
      </div>

      <h3 className={styles.subHeading}>Subject Persons</h3>
      {project.subject_person_ids === null || project.subject_person_ids.length === 0 ? (
        <p className={styles.notIdentified}>Subject not yet identified</p>
      ) : (
        <div className={styles.personsGrid}>
          {subjectPersons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}

      {otherPersons.length > 0 && (
        <>
          <h3 className={styles.subHeading}>Other Persons</h3>
          <div className={styles.personsGrid}>
            {otherPersons.map(({ person, relationship }) => (
              <PersonCard key={person.id} person={person} relationship={relationship} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
