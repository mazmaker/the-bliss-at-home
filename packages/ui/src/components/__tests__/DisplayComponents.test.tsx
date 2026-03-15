// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Avatar from '../Avatar'
import Badge from '../Badge'
import Card from '../Card'
import Loader from '../Loader'
import Modal from '../Modal'
import Table from '../Table'
import Tabs from '../Tabs'

describe('Avatar', () => {
  it('renders image when src provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" alt="User" />)
    const img = screen.getByAltText('User')
    expect(img).toBeDefined()
    expect((img as HTMLImageElement).src).toBe('https://example.com/photo.jpg')
  })

  it('renders fallback text when no src', () => {
    render(<Avatar fallback="JD" />)
    expect(screen.getByText('JD')).toBeDefined()
  })

  it('renders User icon when no src or fallback', () => {
    const { container } = render(<Avatar />)
    // Should render svg (lucide User icon)
    expect(container.querySelector('svg')).toBeDefined()
  })

  it('applies size classes', () => {
    const { container: xs } = render(<Avatar size="xs" />)
    const { container: xl } = render(<Avatar size="xl" />)
    expect(xs.firstElementChild?.className).toContain('w-6')
    expect(xl.firstElementChild?.className).toContain('w-16')
  })

  it('defaults alt to Avatar when no alt', () => {
    render(<Avatar src="https://example.com/photo.jpg" />)
    expect(screen.getByAltText('Avatar')).toBeDefined()
  })
})

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeDefined()
  })

  it('applies default variant classes', () => {
    const { container } = render(<Badge>Test</Badge>)
    expect(container.firstElementChild?.className).toContain('bg-amber-700')
  })

  it('applies success variant', () => {
    const { container } = render(<Badge variant="success">OK</Badge>)
    expect(container.firstElementChild?.className).toContain('bg-green-100')
  })

  it('applies error variant', () => {
    const { container } = render(<Badge variant="error">Fail</Badge>)
    expect(container.firstElementChild?.className).toContain('bg-red-100')
  })

  it('applies warning variant', () => {
    const { container } = render(<Badge variant="warning">Warn</Badge>)
    expect(container.firstElementChild?.className).toContain('bg-yellow-100')
  })

  it('applies info variant', () => {
    const { container } = render(<Badge variant="info">Info</Badge>)
    expect(container.firstElementChild?.className).toContain('bg-blue-100')
  })

  it('applies size classes', () => {
    const { container } = render(<Badge size="lg">Large</Badge>)
    expect(container.firstElementChild?.className).toContain('text-base')
  })
})

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeDefined()
  })

  it('applies default variant', () => {
    const { container } = render(<Card>Test</Card>)
    expect(container.firstElementChild?.className).toContain('border-stone-100')
  })

  it('applies selected variant', () => {
    const { container } = render(<Card variant="selected">Selected</Card>)
    expect(container.firstElementChild?.className).toContain('border-amber-500')
  })

  it('applies hover variant', () => {
    const { container } = render(<Card variant="hover">Hover</Card>)
    expect(container.firstElementChild?.className).toContain('hover:border-amber-300')
  })

  it('applies padding by default', () => {
    const { container } = render(<Card>Padded</Card>)
    expect(container.firstElementChild?.className).toContain('p-6')
  })

  it('removes padding with noPadding', () => {
    const { container } = render(<Card noPadding>NoPad</Card>)
    expect(container.firstElementChild?.className).not.toContain('p-6')
  })
})

describe('Loader', () => {
  it('renders with default size', () => {
    const { container } = render(<Loader />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeDefined()
    expect(spinner?.className).toContain('w-8')
  })

  it('renders small size', () => {
    const { container } = render(<Loader size="sm" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner?.className).toContain('w-4')
  })

  it('renders large size', () => {
    const { container } = render(<Loader size="lg" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner?.className).toContain('w-12')
  })

  it('applies white color', () => {
    const { container } = render(<Loader color="white" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner?.className).toContain('border-t-white')
  })
})

describe('Modal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>Content</Modal>
    )
    expect(container.textContent).toBe('')
  })

  it('renders children when open', () => {
    render(<Modal isOpen={true} onClose={() => {}}>Modal Content</Modal>)
    expect(screen.getByText('Modal Content')).toBeDefined()
  })

  it('renders title', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="My Modal">Content</Modal>)
    expect(screen.getByText('My Modal')).toBeDefined()
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen={true} onClose={onClose}>Content</Modal>
    )
    const backdrop = container.querySelector('.bg-black\\/50')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test">Content</Modal>
    )
    const closeButton = container.querySelector('button')
    if (closeButton) fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('hides close button when showCloseButton is false', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>Content</Modal>
    )
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('Table', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
  ]
  const data = [
    { id: '1', name: 'Alice', age: 30 },
    { id: '2', name: 'Bob', age: 25 },
  ]

  it('renders column headers', () => {
    render(<Table columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('Age')).toBeDefined()
  })

  it('renders data rows', () => {
    render(<Table columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
  })

  it('renders empty message when no data', () => {
    render(<Table columns={columns} data={[]} keyField="id" />)
    expect(screen.getByText('ไม่พบข้อมูล')).toBeDefined()
  })

  it('renders custom empty message', () => {
    render(<Table columns={columns} data={[]} keyField="id" emptyMessage="No results" />)
    expect(screen.getByText('No results')).toBeDefined()
  })

  it('uses custom render function', () => {
    const cols = [
      { key: 'name', label: 'Name', render: (val: string) => <strong>{val}</strong> },
    ]
    render(<Table columns={cols} data={[{ id: '1', name: 'Test' }]} keyField="id" />)
    const strong = screen.getByText('Test')
    expect(strong.tagName).toBe('STRONG')
  })
})

describe('Tabs', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div>, disabled: true },
  ]

  it('renders tab labels', () => {
    render(<Tabs tabs={tabs} />)
    expect(screen.getByText('Tab 1')).toBeDefined()
    expect(screen.getByText('Tab 2')).toBeDefined()
    expect(screen.getByText('Tab 3')).toBeDefined()
  })

  it('shows first tab content by default', () => {
    render(<Tabs tabs={tabs} />)
    expect(screen.getByText('Content 1')).toBeDefined()
  })

  it('switches tab on click', () => {
    render(<Tabs tabs={tabs} />)
    fireEvent.click(screen.getByText('Tab 2'))
    expect(screen.getByText('Content 2')).toBeDefined()
  })

  it('uses defaultTab', () => {
    render(<Tabs tabs={tabs} defaultTab="tab2" />)
    expect(screen.getByText('Content 2')).toBeDefined()
  })

  it('renders pills variant', () => {
    render(<Tabs tabs={tabs} variant="pills" />)
    expect(screen.getByText('Tab 1')).toBeDefined()
    expect(screen.getByText('Content 1')).toBeDefined()
  })

  it('does not switch to disabled tab', () => {
    render(<Tabs tabs={tabs} />)
    fireEvent.click(screen.getByText('Tab 3'))
    // Should still show Tab 1 content since Tab 3 is disabled
    expect(screen.getByText('Content 1')).toBeDefined()
  })
})
