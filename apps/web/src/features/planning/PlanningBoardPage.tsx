import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { FormField } from '../../components/FormField'
import { LoadingState } from '../../components/LoadingState'
import { PageHeader } from '../../components/PageHeader'
import { PermissionDenied } from '../../components/PermissionDenied'
import { fieldAria } from '../../components/fieldAria'
import { ApiError, api, unwrap } from '../../lib/api'
import { useCan, useFactory } from '../../lib/factory'
import { Tabs, type TabItem } from '../../components/Tabs'
import { CapacityGrid } from './CapacityGrid'
import { addDaysIso, isoDateInTimeZone, rangeError } from './dateRange'
import { LinesGuideTab } from './LinesGuideTab'
import { RecommendationCompareSection } from './RecommendationCompareSection'

function PlanningBoard() {
  const factory = useFactory()
  const [start, setStart] = useState(() => isoDateInTimeZone(factory.timezone))
  const [end, setEnd] = useState(() => addDaysIso(isoDateInTimeZone(factory.timezone), 13))
  const error = rangeError(start, end)
  // The combined range error is attributed to one field to avoid showing it twice; it is
  // shown (and wired via `fieldAria`) under "Start date" only when "End date" is also blank.
  const startError = error && !end ? error : undefined

  const query = useQuery({
    queryKey: ['capacity-board', factory.id, start, end],
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/factories/{factory_id}/capacity', {
          params: { path: { factory_id: factory.id }, query: { start, end } },
        }),
      ),
    enabled: !error,
  })

  let body
  if (error) {
    body = null
  } else if (query.isPending) {
    body = <LoadingState label="Loading the capacity board…" variant="table" />
  } else if (query.isError) {
    body =
      query.error instanceof ApiError && query.error.status === 403 ? (
        <PermissionDenied />
      ) : (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      )
  } else if (query.data.lines.length === 0) {
    body = (
      <EmptyState
        icon="factory"
        title="No production lines"
        description="Add production lines for this factory to see the capacity board."
      />
    )
  } else {
    body = <CapacityGrid board={query.data} factoryCode={factory.code} />
  }

  const planningTabs: TabItem[] = [
    {
      id: 'board',
      label: 'Capacity Board',
      content: (
        <div className="flex flex-col gap-6 pt-3">
          <form
            role="search"
            aria-label="Date range"
            className="grid max-w-md grid-cols-2 gap-3"
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <FormField id="planning-start" label="Start date" required error={startError}>
              <input
                type="date"
                className="input"
                value={start}
                {...fieldAria('planning-start', startError, undefined, true)}
                onChange={(event) => {
                  setStart(event.target.value)
                }}
              />
            </FormField>
            <FormField id="planning-end" label="End date" required error={error}>
              <input
                type="date"
                className="input"
                value={end}
                {...fieldAria('planning-end', error, undefined, true)}
                onChange={(event) => {
                  setEnd(event.target.value)
                }}
              />
            </FormField>
          </form>
          <div aria-busy={query.isFetching}>{body}</div>
        </div>
      ),
    },
    {
      id: 'lines-guide',
      label: 'What the Lines Mean',
      content: <LinesGuideTab lines={query.data?.lines} />,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Proposed recommendations at the TOP */}
      <section aria-labelledby="planning-compare">
        <div className="flex items-center justify-between mb-3 border-b border-line pb-2">
          <div>
            <h2 id="planning-compare" className="text-base font-semibold">
              Proposed recommendations
            </h2>
            <p className="text-xs text-fg-muted">
              AI-generated line allocations awaiting decision
            </p>
          </div>
        </div>
        <RecommendationCompareSection />
      </section>

      {/* 2. Planning Tabs: Capacity Board + What the Lines Mean */}
      <section className="flex flex-col gap-4">
        <Tabs label="Planning board views" tabs={planningTabs} />
      </section>
    </div>
  )
}

export function PlanningBoardPage() {
  const can = useCan()
  return (
    <>
      <PageHeader title="Planning board" description="Line capacity, allocation and utilization by date and shift." />
      {can('capacity:read') ? (
        <PlanningBoard />
      ) : (
        <PermissionDenied message="Your role does not include access to the planning board." />
      )}
    </>
  )
}
