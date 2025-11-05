// client/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/* Boot theme ASAP to avoid flash and ensure all pages get it */
(() => {
  try {
    const saved = localStorage.getItem('theme');
    const t = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch {
    // localStorage might be blocked; default to light
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
