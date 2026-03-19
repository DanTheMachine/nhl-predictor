import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import NHLPredictor from './nhl-predictor'
import './index.css'
// import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NHLPredictor />
  </StrictMode>
)
