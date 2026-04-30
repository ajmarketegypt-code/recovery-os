export default function PillarDetail({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{background:'rgba(0,0,0,0.6)'}}>
      <div className="w-full rounded-t-3xl p-6" style={{background:'var(--color-surface)'}}>
        <button onClick={onClose} style={{color:'var(--color-muted)'}}>Close</button>
      </div>
    </div>
  )
}
