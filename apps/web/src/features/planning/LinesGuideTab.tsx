import { Icon } from '../../components/Icon'

export function LinesGuideTab({
  lines,
}: {
  lines?: { code: string; name: string; operator_count?: number }[]
}) {
  const lineDetails = [
    {
      code: 'L1',
      name: 'Sewing Line 1',
      type: 'Standard Production Line',
      desc: 'Optimized for high-volume standard styles with consistent cycle times.',
      bestFor: 'Basic shirts, polos, uniform runs',
    },
    {
      code: 'L2',
      name: 'Sewing Line 2',
      type: 'Flexible Multi-Operation Line',
      desc: 'Configured for complex construction and agile style changeovers.',
      bestFor: 'Jackets, structured garments, specialized seams',
    },
    {
      code: 'L3',
      name: 'Sewing Line 3',
      type: 'High-Throughput Dedicated Line',
      desc: 'High operator capacity with rapid throughput. Deterministically ranked by AI for fast turnarounds when available capacity exceeds plan.',
      bestFor: 'Orders needing quick turnaround (e.g. PO-1067 early delivery)',
    },
  ]

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* 1. Overview of the Factory Lines */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-bold text-fg">Factory Production Lines (L1, L2, L3)</h3>
          <p className="text-xs text-fg-muted">
            Each line represents an independent sewing conveyor where garments progress through sequential operations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {lineDetails.map((item) => (
            <div
              key={item.code}
              className="panel flex flex-col justify-between gap-3 p-4 border border-line rounded-xl shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
                  <span className="font-mono text-base font-bold text-accent">{item.code}</span>
                  <span className="text-xs font-semibold text-fg">{item.name}</span>
                </div>
                <span className="inline-block rounded bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted mb-2">
                  {item.type}
                </span>
                <p className="text-xs text-fg leading-relaxed">{item.desc}</p>
              </div>

              <div className="rounded-lg bg-surface-sunken/60 p-2.5 text-xs">
                <span className="font-semibold text-fg-muted block text-[10px] uppercase tracking-wider mb-0.5">
                  Best For:
                </span>
                <span className="text-fg font-medium">{item.bestFor}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Key Planning Concepts & Terms */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-fg">Planning Board Glossary & Concepts</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel flex flex-col gap-1.5 p-4 border border-line rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <h4 className="text-sm font-bold text-fg">SAM (Standard Allowed Minutes)</h4>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              The engineered duration needed for operators to assemble one garment. For example, 100 units at 11.64 SAM requires 1,164 standard minutes of total line time.
            </p>
          </div>

          <div className="panel flex flex-col gap-1.5 p-4 border border-line rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h4 className="text-sm font-bold text-fg">Shifts (Shift A & Shift B)</h4>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              Working blocks in the factory day. Shift A is standard daytime production; Shift B is the second/evening rotation when added capacity is required.
            </p>
          </div>

          <div className="panel flex flex-col gap-1.5 p-4 border border-line rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h4 className="text-sm font-bold text-fg">Capacity vs Utilization</h4>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              <strong>Capacity:</strong> Total standard operator minutes available in that shift slot.<br />
              <strong>Utilization:</strong> Allocated minutes &divide; Capacity. Slots above 95% trigger high-utilization alerts.
            </p>
          </div>

          <div className="panel flex flex-col gap-1.5 p-4 border border-line rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h4 className="text-sm font-bold text-fg">How AI Chooses Lines (e.g. L3)</h4>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              The Planning Agent cross-checks Industrial Engineering bottleneck cycle times, material arrival dates, and order deadlines to find the line slot that produces all units on time with 0 unscheduled units.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
