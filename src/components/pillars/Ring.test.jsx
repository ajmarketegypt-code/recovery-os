import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: { circle: (props) => <circle {...props} />, button: (props) => <button {...props} /> },
}))

import Ring from './Ring.jsx'

describe('Ring', () => {
  it('renders SVG', () => {
    const { container } = render(<Ring score={75} color="#10b981" size={80} strokeWidth={8} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
  it('handles null score', () => {
    const { container } = render(<Ring score={null} color="#10b981" size={80} strokeWidth={8} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
