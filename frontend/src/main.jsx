import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';
import './styles/theme.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PWAInstallPrompt />
  </React.StrictMode>
);

window.requestAnimationFrame(() => document.getElementById('splash')?.remove());