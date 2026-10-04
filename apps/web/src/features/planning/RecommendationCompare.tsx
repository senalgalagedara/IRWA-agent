import { Icon } from '../../components/Icon'
import { formatDate, formatInteger } from '../../lib/format'

/**
 * A PROPOSED planning recommendation, shaped for comparison against the live
 * board. NOT wired into `PlanningBoardPage` yet: the recommendation routes
 * (`GET .../recommendations`, Task 14) do not exist in the backend or in
 * `src/generated/api.ts` as of Task 23. Per the brief, the compare panel is
 * rendered "only when the route exists in the generated types"; since it
 * does not, `PlanningBoardPage` omits the panel rather than call a route
 * that would not compile, or show placeholder/mock data. This component is
 * kept ready (typed against its own props, not the generated client) so the
 * planning board can wire it in with no redesign once Task 14 lands.
 */
export interface PlanningRecommendationSummary {
  id: string
  orderId: string
  orderExternalRef: string
  allocatedUnits: number
  unscheduledUnits: number
  projectedFinishDate: string | null
  linesUsed: string[]
  /** True when an input (order, capacity slot, material) changed since the recommendation was proposed. */
  isStale: boolean
  reviewPath: string
  rationale?: string
}

export function RecommendationCompare({
  recommendations,
}: {
  recommendations: PlanningRecommendationSummary[]
}) {
  if (recommendations.length === 0) {
    return <p className="text-fg-muted">No proposed recommendations to compare.</p>
  }
  return (
    <ul aria-label="Proposed recommendations" className="flex flex-col gap-4">
      {recommendations.map((recommendation) => {
        const isSuccess = recommendation.unscheduledUnits === 0
        return (
          <li key={recommendation.id} className="panel flex flex-col gap-3 p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-fg">{recommendation.orderExternalRef}</span>
                <span className="text-xs text-fg-muted">AI Allocation Proposal</span>
              </div>
              {recommendation.isStale && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warn-line bg-warn-bg px-2 py-0.5 text-xs font-medium text-warn-fg">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  Stale
                </span>
              )}
            </div>

            {/* Executive Takeaway */}
            <div
              className={`flex flex-col gap-2 rounded-lg border p-3.5 ${
                isSuccess ? 'border-success-line bg-success-bg/20' : 'border-warn-line bg-warn-bg/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" role="img" aria-label={isSuccess ? 'Success' : 'Warning'}>
                  {isSuccess ? '✅' : '⚠️'}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block">The Verdict</span>
                  <span className="text-sm font-bold text-fg">
                    {isSuccess ? 'It can be done on time!' : 'Schedule attention required: units remain unscheduled.'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-fg mt-1">
                {recommendation.rationale ||
                  `Allocate ${formatInteger(recommendation.allocatedUnits)} units on Line ${recommendation.linesUsed?.join(', ') || 'assigned'}, finishing by ${formatDate(recommendation.projectedFinishDate)}.`}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm bg-surface-sunken/40 rounded-lg p-3">
              <dt className="text-fg-muted">Allocated units</dt>
              <dd className="text-right tabular-nums font-medium text-fg">{formatInteger(recommendation.allocatedUnits)}</dd>
              <dt className="text-fg-muted">Unscheduled units</dt>
              <dd className="text-right tabular-nums font-medium text-fg">{formatInteger(recommendation.unscheduledUnits)}</dd>
              <dt className="text-fg-muted">Projected finish</dt>
              <dd className="text-right font-medium text-fg">{formatDate(recommendation.projectedFinishDate)}</dd>
              <dt className="text-fg-muted">Lines used</dt>
              <dd className="text-right font-medium text-fg">{recommendation.linesUsed?.join(', ') || 'None'}</dd>
            </dl>

            <div className="pt-1 flex items-center justify-between">
              <a
                className="btn-primary text-xs h-8 px-3 inline-flex items-center gap-1.5 self-start shadow-xs"
                href={recommendation.reviewPath}
              >
                <span>Review recommendation</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
