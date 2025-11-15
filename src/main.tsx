// Suppress all console logs in production/frontend
if (typeof window !== 'undefined') {
  // Override all console methods to suppress logs
  const noop = () => {}
  console.log = noop
  console.info = noop
  console.debug = noop
  console.warn = noop
  console.error = noop
  console.table = noop
  console.group = noop
  console.groupEnd = noop
  console.groupCollapsed = noop
  console.time = noop
  console.timeEnd = noop
  console.trace = noop
  console.dir = noop
  console.dirxml = noop
  console.assert = noop
  console.count = noop
  console.countReset = noop
  console.clear = noop
}

import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
    // Log to console for debugging on iOS
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => {
        console.error('Global error:', e.error)
      })
      window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason)
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#dc2626' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Initialize app with error handling and DOM ready check
function initApp() {
  try {
    const rootElement = document.getElementById('root')
    
    if (!rootElement) {
      console.error('Root element not found!')
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: system-ui;">Error: Root element not found. Please check the HTML.</div>'
      return
    }

    const root = createRoot(rootElement)
    
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize app:', error)
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui;">
        <h1 style="color: #dc2626;">App Initialization Failed</h1>
        <p style="color: #666;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="window.location.reload()" style="margin-top: 16px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `
  }
}

// Wait for DOM to be ready (especially important for iOS Safari)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  // DOM is already ready
  initApp()
}

// Global error handlers for better debugging on iOS
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error event:', event.error)
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
  })
}
