// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Input from '../Input'
import Select from '../Select'
import TextArea from '../TextArea'
import DatePicker from '../DatePicker'
import Checkbox from '../Checkbox'
import RadioGroup from '../RadioGroup'

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined()
  })

  it('renders label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeDefined()
  })

  it('shows error message', () => {
    render(<Input error="Required field" />)
    expect(screen.getByText('Required field')).toBeDefined()
  })

  it('shows helper text when no error', () => {
    render(<Input helperText="Enter your email" />)
    expect(screen.getByText('Enter your email')).toBeDefined()
  })

  it('hides helper text when error present', () => {
    render(<Input helperText="Enter your email" error="Required" />)
    expect(screen.queryByText('Enter your email')).toBeNull()
    expect(screen.getByText('Required')).toBeDefined()
  })

  it('generates id from label', () => {
    render(<Input label="First Name" />)
    const input = screen.getByLabelText('First Name')
    expect(input.id).toBe('first-name')
  })

  it('uses provided id over generated', () => {
    render(<Input label="Email" id="custom-id" />)
    const input = screen.getByLabelText('Email')
    expect(input.id).toBe('custom-id')
  })
})

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]

  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option A')).toBeDefined()
    expect(screen.getByText('Option B')).toBeDefined()
    expect(screen.getByText('Option C')).toBeDefined()
  })

  it('renders label', () => {
    render(<Select label="Category" options={options} />)
    expect(screen.getByText('Category')).toBeDefined()
  })

  it('shows error message', () => {
    render(<Select options={options} error="Select an option" />)
    expect(screen.getByText('Select an option')).toBeDefined()
  })

  it('shows helper text when no error', () => {
    render(<Select options={options} helperText="Pick one" />)
    expect(screen.getByText('Pick one')).toBeDefined()
  })

  it('generates id from label', () => {
    render(<Select label="Service Type" options={options} />)
    const select = screen.getByLabelText('Service Type')
    expect(select.id).toBe('service-type')
  })
})

describe('TextArea', () => {
  it('renders with placeholder', () => {
    render(<TextArea placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeDefined()
  })

  it('renders label', () => {
    render(<TextArea label="Description" />)
    expect(screen.getByText('Description')).toBeDefined()
  })

  it('shows error message', () => {
    render(<TextArea error="Too short" />)
    expect(screen.getByText('Too short')).toBeDefined()
  })

  it('shows helper text when no error', () => {
    render(<TextArea helperText="Max 500 chars" />)
    expect(screen.getByText('Max 500 chars')).toBeDefined()
  })

  it('generates id from label', () => {
    render(<TextArea label="Your Message" />)
    const textarea = screen.getByLabelText('Your Message')
    expect(textarea.id).toBe('your-message')
  })
})

describe('DatePicker', () => {
  it('renders with label', () => {
    render(<DatePicker label="Start Date" />)
    expect(screen.getByText('Start Date')).toBeDefined()
  })

  it('shows error message', () => {
    render(<DatePicker error="Invalid date" />)
    expect(screen.getByText('Invalid date')).toBeDefined()
  })

  it('shows helper text', () => {
    render(<DatePicker helperText="Select a date" />)
    expect(screen.getByText('Select a date')).toBeDefined()
  })

  it('renders as date input type', () => {
    render(<DatePicker label="Date" />)
    const input = screen.getByLabelText('Date') as HTMLInputElement
    expect(input.type).toBe('date')
  })
})

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />)
    expect(screen.getByText('Accept terms')).toBeDefined()
  })

  it('renders without label', () => {
    const { container } = render(<Checkbox />)
    expect(container.querySelector('input[type="checkbox"]')).toBeDefined()
  })

  it('renders checked state', () => {
    const { container } = render(<Checkbox checked={true} onChange={() => {}} />)
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input.checked).toBe(true)
  })

  it('renders unchecked state', () => {
    const { container } = render(<Checkbox checked={false} onChange={() => {}} />)
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input.checked).toBe(false)
  })
})

describe('RadioGroup', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B', description: 'Description B' },
  ]

  it('renders all options', () => {
    render(<RadioGroup name="test" options={options} value="a" onChange={() => {}} />)
    expect(screen.getByText('Option A')).toBeDefined()
    expect(screen.getByText('Option B')).toBeDefined()
  })

  it('renders option description', () => {
    render(<RadioGroup name="test" options={options} value="a" onChange={() => {}} />)
    expect(screen.getByText('Description B')).toBeDefined()
  })

  it('renders group label', () => {
    render(<RadioGroup name="test" label="Choose one" options={options} value="a" onChange={() => {}} />)
    expect(screen.getByText('Choose one')).toBeDefined()
  })

  it('calls onChange when option clicked', () => {
    const onChange = vi.fn()
    render(<RadioGroup name="test" options={options} value="a" onChange={onChange} />)
    const radioB = screen.getByDisplayValue('b')
    fireEvent.click(radioB)
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('marks selected option as checked', () => {
    render(<RadioGroup name="test" options={options} value="b" onChange={() => {}} />)
    const radioB = screen.getByDisplayValue('b') as HTMLInputElement
    expect(radioB.checked).toBe(true)
  })
})
