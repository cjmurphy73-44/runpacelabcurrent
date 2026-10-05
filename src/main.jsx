import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { base44 } from '@/api/base44Client'

// Global frontend error handler — forwards uncaught browser errors and
// rejected promises to the same Airtable log as WidgetBoundary, so crash
// reporting isn't limited to React render paths. The report is fully
// fire-and-forget: we catch the returned promise so a reporting failure
// can never itself become a recursive unhandledrejection loop.
const reportError = (message, stack, route) => {
  try {
    Promise.resolve(
      base44.functions.invoke('logErrorToAirtable', { message, stack, route, severity: 'High' })
    ).catch(() => { /* swallow — never re-throw into the global handler */ });
  } catch { /* synchronous throw also swallowed */ }
};
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    reportError(`[window.onerror] ${e.message}`, e.error?.stack || e.filename || '', window.location.pathname);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    reportError(`[unhandledrejection] ${r?.message || String(r)}`, r?.stack || '', window.location.pathname);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)