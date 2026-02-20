// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from '../EmptyState'

describe('EmptyState', () => {
  describe('title', () => {
    it('renders title text', () => {
      render(<EmptyState title="ไม่พบข้อมูล" />)
      expect(screen.getByText('ไม่พบข้อมูล')).toBeInTheDocument()
    })

    it('renders title as h3 element', () => {
      render(<EmptyState title="Empty" />)
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Empty')
    })
  })

  describe('description', () => {
    it('renders description when provided', () => {
      render(<EmptyState title="Title" description="กรุณาลองใหม่" />)
      expect(screen.getByText('กรุณาลองใหม่')).toBeInTheDocument()
    })

    it('does not render description when omitted', () => {
      const { container } = render(<EmptyState title="Title" />)
      expect(container.querySelector('p')).toBeNull()
    })
  })

  describe('icon', () => {
    it('renders icon when provided', () => {
      render(<EmptyState title="Title" icon={<span data-testid="icon">📦</span>} />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('does not render icon container when omitted', () => {
      const { container } = render(<EmptyState title="Title" />)
      expect(container.querySelector('.text-stone-400')).toBeNull()
    })
  })

  describe('action button', () => {
    it('renders action button with label', () => {
      const action = { label: 'เพิ่มข้อมูล', onClick: vi.fn() }
      render(<EmptyState title="Title" action={action} />)
      expect(screen.getByRole('button', { name: 'เพิ่มข้อมูล' })).toBeInTheDocument()
    })

    it('calls onClick when action button is clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      render(<EmptyState title="Title" action={{ label: 'Add', onClick: handleClick }} />)
      await user.click(screen.getByRole('button', { name: 'Add' }))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not render button when action is omitted', () => {
      render(<EmptyState title="Title" />)
      expect(screen.queryByRole('button')).toBeNull()
    })
  })

  describe('styling', () => {
    it('has text-center class', () => {
      const { container } = render(<EmptyState title="Title" />)
      expect(container.firstElementChild!.className).toContain('text-center')
    })

    it('merges custom className', () => {
      const { container } = render(<EmptyState title="Title" className="my-extra" />)
      expect(container.firstElementChild!.className).toContain('my-extra')
    })
  })

  describe('full rendering', () => {
    it('renders icon, title, description, and action together', () => {
      render(
        <EmptyState
          icon={<span data-testid="icon">🔍</span>}
          title="ไม่พบผลลัพธ์"
          description="ลองค้นหาด้วยคำอื่น"
          action={{ label: 'ล้างตัวกรอง', onClick: vi.fn() }}
        />
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('ไม่พบผลลัพธ์')).toBeInTheDocument()
      expect(screen.getByText('ลองค้นหาด้วยคำอื่น')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ล้างตัวกรอง' })).toBeInTheDocument()
    })
  })
})
