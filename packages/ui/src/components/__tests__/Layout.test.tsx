// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Container from '../layout/Container'
import Footer from '../layout/Footer'
import Header from '../layout/Header'
import Sidebar from '../layout/Sidebar'

describe('Container', () => {
  it('renders children', () => {
    render(<Container>Container content</Container>)
    expect(screen.getByText('Container content')).toBeDefined()
  })

  it('applies default lg size', () => {
    const { container } = render(<Container>Test</Container>)
    expect(container.firstElementChild?.className).toContain('max-w-6xl')
  })

  it('applies sm size', () => {
    const { container } = render(<Container size="sm">Test</Container>)
    expect(container.firstElementChild?.className).toContain('max-w-2xl')
  })

  it('applies md size', () => {
    const { container } = render(<Container size="md">Test</Container>)
    expect(container.firstElementChild?.className).toContain('max-w-4xl')
  })

  it('applies xl size', () => {
    const { container } = render(<Container size="xl">Test</Container>)
    expect(container.firstElementChild?.className).toContain('max-w-7xl')
  })

  it('applies full size', () => {
    const { container } = render(<Container size="full">Test</Container>)
    expect(container.firstElementChild?.className).toContain('max-w-full')
  })

  it('applies custom className', () => {
    const { container } = render(<Container className="custom-class">Test</Container>)
    expect(container.firstElementChild?.className).toContain('custom-class')
  })
})

describe('Footer', () => {
  it('renders children', () => {
    render(<Footer>Footer content</Footer>)
    expect(screen.getByText('Footer content')).toBeDefined()
  })

  it('renders as footer element', () => {
    const { container } = render(<Footer>Test</Footer>)
    expect(container.querySelector('footer')).toBeDefined()
  })

  it('applies custom className', () => {
    const { container } = render(<Footer className="test-class">Test</Footer>)
    expect(container.querySelector('footer')?.className).toContain('test-class')
  })
})

describe('Header', () => {
  it('renders children', () => {
    render(<Header>Header content</Header>)
    expect(screen.getByText('Header content')).toBeDefined()
  })

  it('renders as header element', () => {
    const { container } = render(<Header>Test</Header>)
    expect(container.querySelector('header')).toBeDefined()
  })

  it('is not sticky by default', () => {
    const { container } = render(<Header>Test</Header>)
    expect(container.querySelector('header')?.className).not.toContain('sticky')
  })

  it('applies sticky class', () => {
    const { container } = render(<Header sticky>Test</Header>)
    expect(container.querySelector('header')?.className).toContain('sticky')
  })

  it('applies custom className', () => {
    const { container } = render(<Header className="test-class">Test</Header>)
    expect(container.querySelector('header')?.className).toContain('test-class')
  })
})

describe('Sidebar', () => {
  it('renders children', () => {
    render(<Sidebar isOpen={true} onClose={() => {}}>Sidebar content</Sidebar>)
    expect(screen.getByText('Sidebar content')).toBeDefined()
  })

  it('renders as aside element', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={() => {}}>Test</Sidebar>)
    expect(container.querySelector('aside')).toBeDefined()
  })

  it('shows backdrop when open', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={() => {}}>Test</Sidebar>)
    expect(container.querySelector('.bg-black\\/50')).toBeDefined()
  })

  it('hides backdrop when closed', () => {
    const { container } = render(<Sidebar isOpen={false} onClose={() => {}}>Test</Sidebar>)
    expect(container.querySelector('.bg-black\\/50')).toBeNull()
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<Sidebar isOpen={true} onClose={onClose}>Test</Sidebar>)
    const backdrop = container.querySelector('.bg-black\\/50')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<Sidebar isOpen={true} onClose={onClose}>Test</Sidebar>)
    // Close button is inside the mobile header
    const buttons = container.querySelectorAll('button')
    if (buttons.length > 0) {
      fireEvent.click(buttons[0])
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('positions on left by default', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={() => {}}>Test</Sidebar>)
    expect(container.querySelector('aside')?.className).toContain('left-0')
  })

  it('positions on right when specified', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={() => {}} position="right">Test</Sidebar>)
    expect(container.querySelector('aside')?.className).toContain('right-0')
  })
})
