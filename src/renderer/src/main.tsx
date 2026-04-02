import React from 'react'
import ReactDOM from 'react-dom/client'
import { installWebApi } from './webApi'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/globals.css'

// Install browser-compatible API shim when not running in Electron
installWebApi()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
