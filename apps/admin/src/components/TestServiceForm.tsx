// Simple test component to check if ServiceForm can be imported
import React from 'react'

// Try to import ServiceForm
try {
  const { ServiceForm } = require('./ServiceForm')
  console.log('✅ ServiceForm imported successfully')
} catch (error) {
  console.error('❌ ServiceForm import error:', error)
}

export function TestServiceForm() {
  return (
    <div className="p-4 bg-green-100 border border-green-500 rounded">
      <h2>🧪 ServiceForm Test Component</h2>
      <p>If you can see this, React is working!</p>
      <p>Check browser console for import results.</p>
    </div>
  )
}