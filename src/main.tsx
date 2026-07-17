import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log("[BOOT] main.tsx Initializing...");

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("CRITICAL: Root element not found!");
}
