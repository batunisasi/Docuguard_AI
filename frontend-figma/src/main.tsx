import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

document.documentElement.lang = 'id'

// Menandai aktivitas scroll agar scrollbar menyala sebentar lalu memudar kembali.
let scrollTimer: number | undefined
document.addEventListener('scroll', () => {
  document.documentElement.setAttribute('data-scrolling', '')
  window.clearTimeout(scrollTimer)
  scrollTimer = window.setTimeout(() => document.documentElement.removeAttribute('data-scrolling'), 900)
}, { capture: true, passive: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
