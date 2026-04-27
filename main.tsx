import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/globals.css'
import GCSDashboard from './app/page'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GCSDashboard />
  </StrictMode>,
)
