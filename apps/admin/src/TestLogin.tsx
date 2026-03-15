import { useState } from 'react'

// Ultra-simple login component for testing
export default function TestLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div>
      <h1>🏨 Admin Login - TEST</h1>

      <form style={{ maxWidth: '300px', margin: '0 auto' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label><br/>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin2@theblissathome.com"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label><br/>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="AdminBliss2026!"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
      </form>

      <p style={{ fontSize: '12px', marginTop: '20px' }}>
        Time: {new Date().toLocaleString()}
      </p>
    </div>
  )
}