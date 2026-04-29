export default function SleepCard({ protocol }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <div className="text-textMuted text-[11px] font-semibold tracking-widest uppercase mb-3">Tonight's Sleep</div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-textMuted text-xs mb-1">Bed by</div>
          <div className="text-textPrimary text-2xl font-bold">{protocol.sleep_target}</div>
        </div>
        <div className="text-textMuted text-lg">→</div>
        <div className="text-right">
          <div className="text-textMuted text-xs mb-1">Wake at</div>
          <div className="text-textPrimary text-2xl font-bold">{protocol.wake_target}</div>
        </div>
      </div>
    </div>
  )
}
