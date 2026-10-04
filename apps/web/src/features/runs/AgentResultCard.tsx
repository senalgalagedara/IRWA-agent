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
    const shortage = metricsByName.get('shortage')
    const coverable = metricsByName.get('coverable_units')
    const isSuccess = shortage !== undefined && (shortage === '0' || Number(shortage) === 0)
    return {
      goal: orderDesc ?? 'Verify material availability and coverage against order Bill of Materials.',
      verdict: isSuccess ? 'Materials in stock & ready for production!' : 'Material shortage detected from suppliers.',
      isSuccess,
      plan: topAction?.summary ?? result.summary,
      unscheduledUnits: coverable ? `Current stock covers up to ${coverable} units` : null,
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
  factoryId,
  timeZone,
}: {
  result: AgentResult
  factoryId: string
  timeZone: string
}) {
  const metadata = result.execution_metadata
  const takeaway = getExecutiveTakeaway(result)

  return (
    <section className="panel flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{AGENT_LABEL[result.agent]}</h3>
        <StateBadge vocabulary="agent_result" state={result.status} />
      </div>

      {/* Highlighted Executive Takeaway Box */}
      <div
        className={`flex flex-col gap-3 rounded-xl border p-4 shadow-xs ${
          takeaway.isSuccess ? 'border-success-line bg-success-bg/25' : 'border-warn-line bg-warn-bg/25'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={takeaway.isSuccess ? 'Success' : 'Warning'}>
              {takeaway.isSuccess ? '✅' : '⚠️'}
            </span>
            <span className="text-base font-semibold text-fg">{takeaway.verdict}</span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
              takeaway.isSuccess
                ? 'border border-success-line bg-success-bg text-success-fg'
                : 'border border-warn-line bg-warn-bg text-warn-fg'
            }`}
          >
            The Verdict
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-fg-muted">
              🎯 The Goal
            </span>
            <p className="font-medium text-fg">{takeaway.goal}</p>
          </div>
          <div>
            <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-fg-muted">
              📋 The Plan
            </span>
            <p className="font-medium text-fg">{takeaway.plan}</p>
          </div>
        </div>

        {takeaway.unscheduledUnits && (
          <div className="flex items-center justify-between rounded-lg bg-surface-sunken/60 px-3 py-2 text-xs">
            <span className="font-medium text-fg-muted">Unscheduled Units:</span>
            <span className={`font-semibold ${takeaway.isSuccess ? 'text-success-fg' : 'text-warn-fg'}`}>
              {takeaway.unscheduledUnits}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-fg-muted">{result.summary}</p>
        <SourceLabel
          source={result.summary_source === 'model' ? { kind: 'ai_recommendation' } : { kind: 'calculated' }}
        />
      </div>

      {result.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-warn-line bg-warn-bg p-2.5 text-warn-fg">
          {result.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-1.5 text-sm">
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold">Findings & Bottlenecks</h4>
        <FindingList findings={result.findings} />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Metrics Explained</h4>
        <MetricTable metrics={result.metrics} />
      </div>

      {result.recommended_actions.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Recommended actions</h4>
          <ul className="flex flex-col gap-2">
            {result.recommended_actions
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((action) => (
                <li key={action.action_id} className="panel flex flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-fg-muted">
                      #{action.rank} · {humanizeCode(action.kind)}
                    </span>
                    <SourceLabel
                      source={action.source === 'model' ? { kind: 'ai_recommendation' } : { kind: 'calculated' }}
                    />
                  </div>
                  <p className="text-sm font-medium">{action.summary}</p>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Advanced Details & Evidence (Collapsible) */}
      <details className="group overflow-hidden rounded-xl border border-line bg-surface-sunken/40">
        <summary className="flex cursor-pointer select-none items-center justify-between p-3.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg">
          <div className="flex items-center gap-2">
            <Icon name="search" className="h-4 w-4" />
            <span>Advanced: Technical Evidence & Citations ({result.evidence_refs.length})</span>
          </div>
          <span className="rounded border border-line bg-surface px-2 py-0.5 text-xs text-fg-muted transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-line bg-surface/50 p-4">
          {!result.data_quality.complete && (
            <div className="rounded-md border border-warn-line bg-warn-bg p-2.5 text-warn-fg">
              <p className="text-sm font-semibold">Data quality</p>
              {result.data_quality.missing.length > 0 && (
                <p className="text-sm">Missing: {result.data_quality.missing.join(', ')}</p>
              )}
              {result.data_quality.notes.map((note) => (
                <p key={note} className="text-sm">
                  {note}
                </p>
              ))}
            </div>
          )}

          <div>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Database Citations & SOP Records
            </h5>
            <EvidenceList
              evidence={result.evidence_refs.map((ref) => fromEvidenceRef(result.agent, ref))}
              factoryId={factoryId}
            />
          </div>

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
