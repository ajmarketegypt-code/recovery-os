import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Pillar from './components/pillars/Pillar.jsx'
import { PILLAR_CONFIGS } from './components/pillars/pillarConfigs.js'
import ChipSelect from './components/ui/ChipSelect.jsx'

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, style, whileTap, ...rest }) => <button onClick={onClick} className={className} style={style} {...rest}>{children}</button>,
    circle: (props) => <circle {...props} />,
    div: ({ children, className, style, ...rest }) => <div className={className} style={style} {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok:true, json:async()=>({}) })
  localStorage.clear()
})

describe('Pillar', () => {
  it('renders dash when data null', () => {
    render(<Pillar config={PILLAR_CONFIGS[0]} data={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
  it('renders score', () => {
    render(<Pillar config={PILLAR_CONFIGS[0]} data={{score:81}} />)
    expect(screen.getByText('81')).toBeInTheDocument()
  })
  it('calls onTap with id', async () => {
    const user=userEvent.setup(), onTap=vi.fn()
    render(<Pillar config={PILLAR_CONFIGS[0]} data={{score:81}} onTap={onTap} />)
    await user.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledWith('sleep')
  })
})

describe('ChipSelect', () => {
  it('selects chip', async () => {
    const user=userEvent.setup(), onChange=vi.fn()
    render(<ChipSelect options={[{id:'alcohol',emoji:'🍷',label:'Alcohol'}]} selected={[]} onChange={onChange} />)
    await user.click(screen.getByText(/Alcohol/))
    expect(onChange).toHaveBeenCalledWith(['alcohol'])
  })
})
