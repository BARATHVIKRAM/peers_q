import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0A1628',
            color: '#fff',
            border: '1px solid rgba(79,195,247,0.2)',
            borderRadius: '12px',
            fontFamily: '"Plus Jakarta Sans", sans-serif'
          },
          success: { iconTheme: { primary: '#4FC3F7', secondary: '#0A1628' } },
          error: { iconTheme: { primary: '#FF6B6B', secondary: '#0A1628' } }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
