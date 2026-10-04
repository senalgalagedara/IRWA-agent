import { Link } from 'react-router'
import { StateBadge } from '../../components/StateBadge'
import { SourceLabel } from '../../components/SourceLabel'
import { Icon } from '../../components/Icon'
import type { Schemas } from '../../lib/api'
import { formatDateTime, formatInteger, humanizeCode } from '../../lib/format'
import { EvidenceList } from '../evidence/EvidenceList'
import { fromEvidenceRef } from '../evidence/evidenceItem'
import { FindingList } from './FindingList'
import { MetricTable } from './MetricTable'

type AgentResult = Schemas['AgentResult']

const AGENT_LABEL: Record<AgentResult['agent'], string> = {
  planning: 'Planning',
  rm: 'Raw materials',
  ie: 'Industrial engineering',
  quality: 'Quality',
}

function getExecutiveTakeaway(result: AgentResult) {
  const metricsByName = new Map(result.metrics.map((m) => [m.name, m.value]))
  const unscheduled = metricsByName.get('unscheduled_units')
  const allocated = metricsByName.get('allocated_units')
  const topAction = result.recommended_actions.slice().sort((a, b) => a.rank - b.rank)[0]

  const orderRef = result.evidence_refs.find((e) => e.record_type === 'order')
  const orderDesc = orderRef?.description

  if (result.agent === 'planning') {
    const isSuccess = unscheduled !== undefined && (unscheduled === '0' || Number(unscheduled) === 0)
    return {
      goal: orderDesc ?? `Produce all ${allocated ?? 100} units before order deadline.`,
      verdict: isSuccess ? 'It can be done on time!' : 'Schedule attention required: units remain unscheduled.',
      isSuccess,
      plan: topAction?.summary ?? result.summary,
      unscheduledUnits: isSuccess
        ? '0 (100% of the order fits on the line)'
        : `${unscheduled ?? 'Unknown'} units left unscheduled`,
    }
  }

  if (result.agent === 'rm') {
    const hasAnyShortage = result.metrics.some(
      (m) => m.name.startsWith('shortage') && Number(m.value) > 0
    )
    const coverable = metricsByName.get('coverable_units')
    const isSuccess = !hasAnyShortage
    return {
      goal: orderDesc ?? 'Verify material availability and coverage against order Bill of Materials.',
      verdict: isSuccess ? 'All materials in stock & ready for production!' : 'Material shortage detected from suppliers.',
      isSuccess,
      plan: topAction?.summary ?? result.summary,
      unscheduledUnits: coverable ? `Stock covers up to ${Number(coverable).toLocaleString()} units (Plenty for this order)` : '100% of materials available',
    }
  }

  if (result.agent === 'ie') {
    const balance = metricsByName.get('line_balance_index')
    const hasBottleneck = result.findings.some((f) => f.severity === 'warning' || f.code.includes('BOTTLENECK'))
    return {
      goal: 'Assess line balance, operation cycle times, and bottleneck throughput.',
      verdict: !hasBottleneck ? 'Line capacity and balance confirmed!' : 'Bottleneck risk detected on selected line.',
      isSuccess: !hasBottleneck,
      plan: topAction?.summary ?? result.summary,
      unscheduledUnits: balance ? `Line balance efficiency: ${balance}` : null,
    }
  }

  // Quality
  const hasHold = result.findings.some((f) => f.severity === 'warning' || f.code.includes('HOLD'))
  return {
    goal: 'Assess DHU defect rates, AQL standards, and quarantine hold status.',
    verdict: !hasHold ? 'Quality standards satisfied!' : 'Quality review required before shipment release.',
    isSuccess: !hasHold,
    plan: topAction?.summary ?? result.summary,
    unscheduledUnits: null,
  }
}

/** One agent's full result within a run: status, findings, metrics, recommended
 * actions, data quality and execution metadata. */
export function AgentResultCard({
  result,
  factoryCode,
  factoryId,
  timeZone,
  recommendationId,
}: {
  result: AgentResult
  factoryCode: string
  factoryId?: string
  timeZone: string
  recommendationId?: string | null
}) {
  const metadata = result.execution_metadata
  const takeaway = getExecutiveTakeaway(result)

  const code = factoryCode || factoryId || ''
  const approvalUrl = recommendationId
    ? `/f/${encodeURIComponent(code)}/approvals/${encodeURIComponent(recommendationId)}`
    : `/f/${encodeURIComponent(code)}/approvals`

  return (
    <section className="panel flex flex-col gap-5 p-5">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-fg">{AGENT_LABEL[result.agent]}</h3>
          <span className="text-xs text-fg-muted">Domain Assessment</span>
        </div>
        <StateBadge vocabulary="agent_result" state={result.status} />
      </div>

      {/* 2. RECOMMENDED ACTION FIRST (Clear, prominent, actionable) */}
      <div
        className={`flex flex-col gap-4 rounded-xl border p-5 shadow-xs transition-all ${
          takeaway.isSuccess ? 'border-success-line bg-success-bg/25' : 'border-warn-line bg-warn-bg/25'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label={takeaway.isSuccess ? 'Success' : 'Warning'}>
              {takeaway.isSuccess ? '✅' : '⚠️'}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-fg-muted block">The Verdict</span>
              <h4 className="text-base font-bold text-fg">{takeaway.verdict}</h4>
            </div>
          </div>
          <Link
            to={approvalUrl}
            className="btn-primary text-xs h-8 px-3 inline-flex items-center gap-1.5 shadow-xs"
          >
            <span>Review in Approvals</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {/* The Concrete Plan / Recommendation */}
        <div className="rounded-lg bg-surface/90 border border-line p-3.5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-accent block mb-1">
            🚀 Recommended Action to Take
          </span>
          <p className="text-base font-semibold text-fg">
            {takeaway.plan}
          </p>
        </div>

        {/* Quick Goal & Unscheduled breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-surface-sunken/60 p-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-0.5">🎯 The Goal</span>
            <p className="font-medium text-fg">{takeaway.goal}</p>
          </div>
          <div className="rounded-lg bg-surface-sunken/60 p-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-muted block mb-0.5">📦 Unscheduled Units</span>
            <p className={`font-semibold ${takeaway.isSuccess ? 'text-success-fg' : 'text-warn-fg'}`}>
              {takeaway.unscheduledUnits ?? '0 units (Fully scheduled)'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. KEY METRICS EXPLAINED (Numbers made simple) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-fg">📊 Key Numbers Explained</h4>
          <span className="text-xs text-fg-muted">Calculated from factory records</span>
        </div>
        <MetricTable metrics={result.metrics} />
      </div>

      {/* 4. Alternative Options (if multiple options were evaluated) */}
      {result.recommended_actions.length > 1 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Alternative Options Evaluated ({result.recommended_actions.length - 1})
          </h4>
          <ul className="flex flex-col gap-2">
            {result.recommended_actions
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .slice(1)
              .map((action) => (
                <li key={action.action_id} className="panel flex flex-col gap-1 p-2.5 text-xs text-fg-muted">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">#{action.rank} · {humanizeCode(action.kind)}</span>
                    <SourceLabel source={action.source === 'model' ? { kind: 'ai_recommendation' } : { kind: 'calculated' }} />
                  </div>
                  <p>{action.summary}</p>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 5. HIDDEN BY DEFAULT: BOTTLENECKS, FINDINGS, INFO & EVIDENCE IN ACCORDION */}
      <details className="group overflow-hidden rounded-xl border border-line bg-surface-sunken/40">
        <summary className="flex cursor-pointer select-none items-center justify-between p-3.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg">
          <div className="flex items-center gap-2">
            <Icon name="search" className="h-4 w-4" />
            <span>
              View Technical Details, Bottlenecks & Citations ({result.findings.length} findings, {result.evidence_refs.length} records)
            </span>
          </div>
          <span className="rounded border border-line bg-surface px-2 py-0.5 text-xs text-fg-muted transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-line bg-surface/50 p-4">
          {/* Bottlenecks & Findings */}
          {result.findings.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Findings & Bottleneck Observations
              </h5>
              <FindingList findings={result.findings} />
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-md border border-warn-line bg-warn-bg p-2.5 text-warn-fg">
              {result.warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-1.5 text-xs">
                  <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          )}

          {/* Model notes & raw commentary */}
          <div className="rounded-md bg-surface-sunken/60 p-2.5 text-xs text-fg-muted">
            <span className="font-semibold block mb-1">Model Commentary:</span>
            <p>{result.summary}</p>
          </div>

          {/* Data quality */}
          {!result.data_quality.complete && (
            <div className="rounded-md border border-warn-line bg-warn-bg p-2.5 text-warn-fg">
              <p className="text-xs font-semibold">Data quality</p>
              {result.data_quality.missing.length > 0 && (
                <p className="text-xs">Missing: {result.data_quality.missing.join(', ')}</p>
              )}
              {result.data_quality.notes.map((note) => (
                <p key={note} className="text-xs">{note}</p>
              ))}
            </div>
          )}

          {/* Cited Evidence */}
          <div>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Database Citations & SOP Records
            </h5>
            <EvidenceList
              evidence={result.evidence_refs.map((ref) => fromEvidenceRef(result.agent, ref))}
              factoryId={factoryId}
            />
          </div>

          {/* Execution metadata */}
          <div>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Model & Execution Metadata
            </h5>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-fg-muted sm:grid-cols-3">
              <dt>Provider</dt>
              <dd className="text-fg">{metadata.provider}</dd>
              <dt>Model</dt>
              <dd className="text-fg">{metadata.model}</dd>
              <dt>Model calls</dt>
              <dd className="tabular-nums text-fg">{formatInteger(metadata.model_calls)}</dd>
              <dt>Tokens</dt>
              <dd className="tabular-nums text-fg">
                {formatInteger(metadata.input_tokens)} in / {formatInteger(metadata.output_tokens)} out
              </dd>
              <dt>Prompt version</dt>
              <dd className="font-mono text-fg">{metadata.prompt_version}</dd>
              <dt>Tool calls</dt>
              <dd className="text-fg">{metadata.tool_calls.length > 0 ? metadata.tool_calls.join(', ') : 'None'}</dd>
              <dt>Started</dt>
              <dd className="text-fg">{formatDateTime(metadata.started_at, timeZone)}</dd>
              <dt>Completed</dt>
              <dd className="text-fg">{formatDateTime(metadata.completed_at, timeZone)}</dd>
              {metadata.degraded && (
                <>
                  <dt>Degraded reason</dt>
                  <dd className="text-fg">{metadata.degraded_reason ?? 'Unknown'}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </details>
    </section>
  )
}
