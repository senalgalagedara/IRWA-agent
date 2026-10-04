import { DataTable, type Column } from '../../components/DataTable'
import type { Schemas } from '../../lib/api'
import { formatDecimal } from '../../lib/format'

type Metric = Schemas['Metric']

export const METRIC_DESCRIPTIONS: Record<string, { label: string; meaning: string }> = {
  sam_minutes: {
    label: 'SAM (Standard Allowed Minutes)',
    meaning: 'The engineered time needed to sew one garment of this style.',
  },
  required_standard_minutes: {
    label: 'Required Standard Minutes',
    meaning: 'Total production work needed (Order Quantity × SAM).',
  },
  allocated_units: {
    label: 'Allocated Units',
    meaning: 'Units successfully booked into the factory production schedule.',
  },
  unscheduled_units: {
    label: 'Unscheduled Units',
    meaning: 'Units that could not be scheduled or are at risk of delay.',
  },
  coverable_units: {
    label: 'Coverable Units',
    meaning: 'Maximum garments that current in-stock materials can produce.',
  },
  gross_demand: {
    label: 'Gross Demand',
    meaning: 'Total raw materials required including standard fabric wastage.',
  },
  shortage: {
    label: 'Material Shortage',
    meaning: 'Missing material quantity needed before cutting can start.',
  },
  coverage_days: {
    label: 'Coverage Days',
    meaning: 'Days of production the current inventory balance can sustain.',
  },
  available_now: {
    label: 'Available Stock',
    meaning: 'Accepted warehouse stock minus existing reservations.',
  },
  projected_balance: {
    label: 'Projected Balance',
    meaning: 'Expected stock balance after this order and receipts arrive.',
  },
  line_balance_index: {
    label: 'Line Balancing Index',
    meaning: 'Work distribution efficiency across all sewing workstations.',
  },
  bottleneck_cycle_seconds: {
    label: 'Bottleneck Cycle Time',
    meaning: 'Slowest operation speed gating the entire sewing line throughput.',
  },
  defects_per_hundred_units: {
    label: 'DHU (Defects / 100 Units)',
    meaning: 'Average number of defects found across every 100 units inspected.',
  },
  defective_rate: {
    label: 'Defect Rate',
    meaning: 'Percentage of inspected garments that failed quality checks.',
  },
}

const COLUMNS: Column<Metric>[] = [
  {
    key: 'name',
    header: 'Metric',
    render: (row) => {
      const [baseKey, materialCode] = row.name.split(':')
      const meta = METRIC_DESCRIPTIONS[baseKey ?? ''] ?? METRIC_DESCRIPTIONS[row.name]
      const label = meta ? (materialCode ? `${meta.label} (${materialCode})` : meta.label) : row.name
      return (
        <div className="flex flex-col">
          <span className="font-medium text-fg">{label}</span>
          <span className="font-mono text-xs text-fg-muted">{row.name}</span>
        </div>
      )
    },
  },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    render: (row) => (
      <div className="tabular-nums font-semibold text-fg">
        {formatDecimal(row.value)} {row.unit && <span className="text-xs font-normal text-fg-muted">{row.unit}</span>}
      </div>
    ),
  },
  {
    key: 'meaning',
    header: 'What it means',
    render: (row) => {
      const [baseKey, materialCode] = row.name.split(':')
      const meta = METRIC_DESCRIPTIONS[baseKey ?? ''] ?? METRIC_DESCRIPTIONS[row.name]
      return (
        <div className="flex flex-col gap-0.5 text-xs text-fg-muted">
          <span>
            {meta
              ? materialCode
                ? `${meta.meaning} (for item ${materialCode})`
                : meta.meaning
              : 'Metric recorded for this assessment.'}
          </span>
          {row.note && <span className="italic text-fg-muted/80">{row.note}</span>}
        </div>
      )
    },
  },
]

/** An agent result's metrics with clear, understandable explanations. */
export function MetricTable({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) {
    return <p className="text-fg-muted">No metrics.</p>
  }
  return <DataTable caption="Metrics" columns={COLUMNS} rows={metrics} rowKey={(row) => row.name} />
}
