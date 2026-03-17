import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { logger } from './utils/logger';

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  logger.error('Global Error Detected:', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = (event) => {
  logger.error('Unhandled Promise Rejection:', event.reason);
};

// Fade out and remove the native loading spinner
const fadeOutLoader = () => {
  const loader = document.getElementById('app-loading');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 200);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Remove loader after first paint
requestAnimationFrame(() => {
  requestAnimationFrame(fadeOutLoader);
});
