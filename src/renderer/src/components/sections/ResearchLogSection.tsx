import { useState, useMemo } from 'react'
import { useResearchData } from '../../contexts/ResearchDataContext'
import StatusBadge from '../shared/StatusBadge'
import CrossLink from '../shared/CrossLink'
import type { LogEntry } from '../../lib/schema'
import styles from './ResearchLogSection.module.css'

type SortKey = 'performed' | 'tool' | 'outcome' | 'results_examined'
type SortDir = 'asc' | 'desc'

function compareEntries(a: LogEntry, b: LogEntry, key: SortKey, dir: SortDir): number {
  let cmp = 0
  switch (key) {
    case 'performed':
      cmp = a.performed.localeCompare(b.performed)
      break
    case 'tool':
      cmp = a.tool.localeCompare(b.tool)
      break
    case 'outcome':
      cmp = a.outcome.localeCompare(b.outcome)
      break
    case 'results_examined':
      cmp = a.results_examined - b.results_examined
      break
  }
  return dir === 'desc' ? -cmp : cmp
}

export default function ResearchLogSection(): React.JSX.Element {
  const { research, devMode } = useResearchData()
  const logEntries = research?.log ?? []

  const [sortKey, setSortKey] = useState<SortKey>('performed')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...logEntries].sort((a, b) => compareEntries(a, b, sortKey, sortDir)),
    [logEntries, sortKey, sortDir]
  )

  const handleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const renderSortIndicator = (key: SortKey): React.JSX.Element | null => {
    if (sortKey !== key) return null
    return <span className={styles.sortIndicator}>{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  if (logEntries.length === 0) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Research Log</h2>
        <p className={styles.empty}>No log entries yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Research Log</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => handleSort('performed')}>
              Date{renderSortIndicator('performed')}
            </th>
            <th onClick={() => handleSort('tool')}>
              Tool{renderSortIndicator('tool')}
            </th>
            <th onClick={() => handleSort('outcome')}>
              Outcome{renderSortIndicator('outcome')}
            </th>
            <th onClick={() => handleSort('results_examined')}>
              Results{renderSortIndicator('results_examined')}
            </th>
            <th>Sources</th>
            <th>Assertions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const isExpanded = expandedId === entry.id
            return (
              <tr key={entry.id} id={entry.id}>
                <td colSpan={6} style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr
                        className={styles.clickableRow}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <td>{entry.performed}</td>
                        <td>{entry.tool}</td>
                        <td><StatusBadge value={entry.outcome} /></td>
                        <td>{entry.results_examined}</td>
                        <td>
                          <div className={styles.linkList}>
                            <span className={styles.count}>{entry.captured_source_ids.length}</span>
                            {entry.captured_source_ids.map((id) => (
                              <CrossLink key={id} id={id} />
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className={styles.linkList}>
                            <span className={styles.count}>{entry.produced_assertion_ids.length}</span>
                            {entry.produced_assertion_ids.map((id) => (
                              <CrossLink key={id} id={id} />
                            ))}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className={styles.expandedRow}>
                          <td colSpan={6}>
                            <div className={styles.expandedContent}>
                              <div className={styles.field}>
                                <div className={styles.fieldLabel}>Query</div>
                                <pre className={styles.queryBlock}>
                                  {JSON.stringify(entry.query, null, 2)}
                                </pre>
                              </div>

                              {entry.notes && (
                                <div className={styles.field}>
                                  <div className={styles.fieldLabel}>Notes</div>
                                  <div className={styles.fieldValue}>{entry.notes}</div>
                                </div>
                              )}

                              {entry.external_site && (
                                <div className={styles.field}>
                                  <div className={styles.fieldLabel}>External Site</div>
                                  <div className={styles.fieldValue}>
                                    {entry.external_site.site} &middot;{' '}
                                    {entry.external_site.capture_received ? 'Captured' : 'Not captured'}
                                    {entry.external_site.capture_filename && (
                                      <> &middot; {entry.external_site.capture_filename}</>
                                    )}
                                  </div>
                                </div>
                              )}

                              {devMode && (
                                <div className={styles.field}>
                                  <div className={styles.fieldLabel}>Raw JSON</div>
                                  <pre className={styles.queryBlock}>
                                    {JSON.stringify(entry, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
