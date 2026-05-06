import { useResearchData } from '../../contexts/ResearchDataContext'
import Card from '../shared/Card'
import StatusBadge from '../shared/StatusBadge'
import CrossLink from '../shared/CrossLink'
import type { Source } from '../../lib/schema'
import styles from './SourcesSection.module.css'

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

function SourceCard({ source }: { source: Source }): React.JSX.Element {
  const { citation_detail: detail } = source

  const handleLinkClick = (url: string): void => {
    window.api.openExternal(url)
  }

  return (
    <Card
      id={source.id}
      title={detail.what}
      badges={<StatusBadge value={source.source_classification} />}
      summary={truncate(source.citation, 200)}
      footer={
        <CrossLink
          id={source.gedcomx_source_description_id}
          label={`GedcomX: ${source.gedcomx_source_description_id}`}
        />
      }
      rawData={source}
    >
      <div className={styles.detailGrid}>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Who</div>
          <div className={styles.fieldValue}>{detail.who}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>What</div>
          <div className={styles.fieldValue}>{detail.what}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>When Created</div>
          <div className={styles.fieldValue}>{detail.when_created}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>When Accessed</div>
          <div className={styles.fieldValue}>{detail.when_accessed}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Where</div>
          <div className={styles.fieldValue}>{detail.where}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Where Within</div>
          <div className={styles.fieldValue}>{detail.where_within}</div>
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Repository</div>
        <div className={styles.fieldValue}>{source.repository}</div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Access Date</div>
        <div className={styles.fieldValue}>{source.access_date}</div>
      </div>

      {source.url && (
        <div className={styles.field}>
          <div className={styles.fieldLabel}>URL</div>
          <button
            className={styles.externalLink}
            onClick={() => handleLinkClick(source.url!)}
          >
            {source.url}
          </button>
        </div>
      )}

      {source.notes && (
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Notes</div>
          <div className={styles.notes}>{source.notes}</div>
        </div>
      )}
    </Card>
  )
}

export default function SourcesSection(): React.JSX.Element {
  const { research } = useResearchData()
  const sources = research?.sources ?? []

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Sources</h2>
      {sources.length === 0 ? (
        <p className={styles.empty}>No sources captured yet.</p>
      ) : (
        sources.map((s) => <SourceCard key={s.id} source={s} />)
      )}
    </div>
  )
}
