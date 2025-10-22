import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { ToastProvider } from './components/base/Toast'
import { getAuthState } from './utils/auth'
import { apiRequest } from './utils/api'

declare const __BASE_PATH__: string

function App() {


  return (
    <ToastProvider>
      <BrowserRouter
        basename={__BASE_PATH__}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App