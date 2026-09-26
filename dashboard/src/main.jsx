import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App.jsx'

// Initialize Lenis smooth scrolling across the entire site
const lenis = new Lenis({
  autoRaf: true,
  smoothWheel: true,
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
})

// Expose lenis globally for programmatic scroll if needed
window.__lenis = lenis

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

