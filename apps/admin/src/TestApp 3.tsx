// Simple test component to debug white screen issue

function TestApp() {
  console.log('✅ TestApp is rendering!')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px'
        }}>
          🎉 Admin App is Working!
        </h1>
        <p style={{ color: '#4b5563', marginBottom: '8px' }}>
          Mock Auth Mode: {'true'}
        </p>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Time: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default TestApp