import { motion } from 'framer-motion'
export default function ChipSelect({ options, selected=[], onChange }) {
  const toggle = id => onChange(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt.id)
        return (
          <motion.button key={opt.id} onClick={()=>toggle(opt.id)} whileTap={{scale:0.9}} layout
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: active ? 'var(--color-accent)' : 'var(--color-surface)',
              color: active ? 'var(--color-bg)' : 'var(--color-muted)',
              border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`
            }}>
            {opt.emoji} {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}
