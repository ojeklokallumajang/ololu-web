import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(<App />);
  }
} catch (e) {
  console.error("FATAL BOOT ERROR:", e);
  document.body.innerHTML = '<div style="padding:40px;text-align:center;"><h1>Sistem Gagal Memuat</h1><p>' + e + '</p></div>';
}
