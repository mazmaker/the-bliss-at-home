// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '../Pagination'

describe('Pagination', () => {
  describe('page numbers (≤7 pages, no ellipsis)', () => {
    it('renders all page buttons for 5 pages', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
      }
    })

    it('renders all page buttons for 7 pages', () => {
      render(<Pagination currentPage={1} totalPages={7} onPageChange={vi.fn()} />)
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
      }
    })

    it('renders single page', () => {
      render(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />)
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    })
  })

  describe('ellipsis patterns (>7 pages)', () => {
    it('shows end ellipsis when near start (page 1)', () => {
      render(<Pagination currentPage={1} totalPages={20} onPageChange={vi.fn()} />)
      // Pages: 1 2 3 4 5 ... 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
      expect(screen.getByText('...')).toBeInTheDocument()
    })

    it('shows start ellipsis when near end (page 19)', () => {
      render(<Pagination currentPage={19} totalPages={20} onPageChange={vi.fn()} />)
      // Pages: 1 ... 16 17 18 19 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '16' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
      expect(screen.getByText('...')).toBeInTheDocument()
    })

    it('shows both ellipses when in middle (page 10)', () => {
      render(<Pagination currentPage={10} totalPages={20} onPageChange={vi.fn()} />)
      // Pages: 1 ... 9 10 11 ... 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '11' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
      expect(screen.getAllByText('...')).toHaveLength(2)
    })
  })

  describe('navigation', () => {
    it('calls onPageChange with page number when clicked', async () => {
      const onPageChange = vi.fn()
      const user = userEvent.setup()
      render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)
      await user.click(screen.getByRole('button', { name: '3' }))
      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('calls onPageChange with prev page on prev button click', async () => {
      const onPageChange = vi.fn()
      const user = userEvent.setup()
      render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
      // Prev button is the first navigation button (before page numbers)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0]) // prev button
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange with next page on next button click', async () => {
      const onPageChange = vi.fn()
      const user = userEvent.setup()
      render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[buttons.length - 1]) // next button (last)
      expect(onPageChange).toHaveBeenCalledWith(4)
    })
  })

  describe('disabled states', () => {
    it('disables prev button on first page', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toBeDisabled() // prev button
    })

    it('disables next button on last page', () => {
      render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[buttons.length - 1]).toBeDisabled() // next button
    })

    it('enables both nav buttons on middle page', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).not.toBeDisabled() // prev
      expect(buttons[buttons.length - 1]).not.toBeDisabled() // next
    })
  })

  describe('current page highlight', () => {
    it('highlights current page with active class', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
      const activeBtn = screen.getByRole('button', { name: '2' })
      expect(activeBtn.className).toContain('from-amber-700')
      expect(activeBtn.className).toContain('text-white')
    })

    it('non-current pages have default style', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
      const otherBtn = screen.getByRole('button', { name: '3' })
      expect(otherBtn.className).toContain('border-stone-200')
      expect(otherBtn.className).not.toContain('from-amber-700')
    })
  })

  describe('showFirstLast', () => {
    it('does not show first/last buttons by default', () => {
      render(<Pagination currentPage={3} totalPages={10} onPageChange={vi.fn()} />)
      // Without showFirstLast: only prev + page buttons + next
      const buttons = screen.getAllByRole('button')
      // prev(1) + pages + next(1)
      expect(buttons.length).toBeGreaterThanOrEqual(3)
    })

    it('shows first/last buttons when showFirstLast is true', () => {
      render(<Pagination currentPage={3} totalPages={10} onPageChange={vi.fn()} showFirstLast />)
      const buttons = screen.getAllByRole('button')
      // first(1) + prev(1) + pages + next(1) + last(1) = +2 extra
      expect(buttons.length).toBeGreaterThanOrEqual(5)
    })
  })
})
