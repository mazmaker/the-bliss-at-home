// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }: any) => (
    <a href={to} className={className} data-testid="mock-link">{children}</a>
  ),
}))

import { AuthLayout } from '../AuthLayout'

describe('AuthLayout', () => {
  it('renders app title', () => {
    render(<AuthLayout appTitle="Test App">Content</AuthLayout>)
    expect(screen.getByText('Test App')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(<AuthLayout appTitle="App">Hello World</AuthLayout>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders footer with year and app title', () => {
    render(<AuthLayout appTitle="My App">Content</AuthLayout>)
    const year = new Date().getFullYear()
    expect(screen.getByText(`© ${year} My App. All rights reserved.`)).toBeInTheDocument()
  })

  it('shows back link by default', () => {
    render(<AuthLayout appTitle="App">Content</AuthLayout>)
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
  })

  it('hides back link when showBackLink is false', () => {
    render(<AuthLayout appTitle="App" showBackLink={false}>Content</AuthLayout>)
    expect(screen.queryByText('Back to Home')).not.toBeInTheDocument()
  })

  it('uses custom back link text', () => {
    render(<AuthLayout appTitle="App" backLinkText="Go Back">Content</AuthLayout>)
    expect(screen.getByText('Go Back')).toBeInTheDocument()
  })

  it('uses custom back link path', () => {
    render(<AuthLayout appTitle="App" backLinkTo="/home">Content</AuthLayout>)
    const link = screen.getByTestId('mock-link')
    expect(link.getAttribute('href')).toBe('/home')
  })

  it('renders app logo when provided', () => {
    render(<AuthLayout appTitle="App" appLogo="/logo.png">Content</AuthLayout>)
    const img = screen.getByAltText('App')
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toBe('/logo.png')
  })

  it('does not render logo when not provided', () => {
    render(<AuthLayout appTitle="App">Content</AuthLayout>)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('applies default background variant', () => {
    const { container } = render(<AuthLayout appTitle="App">Content</AuthLayout>)
    expect(container.firstChild).toHaveClass('bg-gray-50')
  })

  it('applies gradient background variant', () => {
    const { container } = render(<AuthLayout appTitle="App" backgroundVariant="gradient">Content</AuthLayout>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-gradient-to-br')
  })

  it('applies image background variant', () => {
    const { container } = render(<AuthLayout appTitle="App" backgroundVariant="image">Content</AuthLayout>)
    expect(container.firstChild).toHaveClass('bg-gray-900')
  })
})
