// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'

describe('Button', () => {
  describe('rendering', () => {
    it('renders children text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders as a button element', () => {
      render(<Button>Test</Button>)
      expect(screen.getByRole('button')).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('variants', () => {
    it('applies primary variant classes by default', () => {
      render(<Button>Primary</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('from-amber-700')
      expect(btn.className).toContain('text-white')
    })

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('bg-stone-100')
      expect(btn.className).toContain('text-stone-700')
    })

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('border-amber-700')
      expect(btn.className).toContain('text-amber-700')
    })

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('text-amber-700')
    })

    it('applies danger variant classes', () => {
      render(<Button variant="danger">Danger</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('bg-red-600')
      expect(btn.className).toContain('text-white')
    })
  })

  describe('sizes', () => {
    it('applies md size classes by default', () => {
      render(<Button>Medium</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('px-6')
      expect(btn.className).toContain('py-3')
    })

    it('applies sm size classes', () => {
      render(<Button size="sm">Small</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('px-4')
      expect(btn.className).toContain('py-2')
      expect(btn.className).toContain('text-sm')
    })

    it('applies lg size classes', () => {
      render(<Button size="lg">Large</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain('px-8')
      expect(btn.className).toContain('py-4')
      expect(btn.className).toContain('text-lg')
    })
  })

  describe('fullWidth', () => {
    it('does not have w-full by default', () => {
      render(<Button>Normal</Button>)
      expect(screen.getByRole('button').className).not.toContain('w-full')
    })

    it('applies w-full when fullWidth is true', () => {
      render(<Button fullWidth>Full</Button>)
      expect(screen.getByRole('button').className).toContain('w-full')
    })
  })

  describe('disabled', () => {
    it('is not disabled by default', () => {
      render(<Button>Enabled</Button>)
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('is disabled when prop is set', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('has disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button').className).toContain('disabled:opacity-50')
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      render(<Button onClick={handleClick}>Click</Button>)
      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      render(<Button onClick={handleClick} disabled>Click</Button>)
      await user.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('custom className', () => {
    it('merges custom className', () => {
      render(<Button className="my-custom-class">Custom</Button>)
      expect(screen.getByRole('button').className).toContain('my-custom-class')
    })
  })

  describe('forwarded props', () => {
    it('passes type prop', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('passes aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>)
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    })
  })
})
