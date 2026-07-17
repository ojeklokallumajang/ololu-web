import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// GLOBAL ERROR BOUNDARY FOR WHITE SCREEN CATCHING
class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRITICAL CRASH:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#DC2626' }}>🚨 Aplikasi Terhenti</h1>
          <p style={{ color: '#4B5563' }}>Terjadi kesalahan fatal pada sistem tampilan.</p>
          <div style={{ backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace', maxWidth: '100%', overflowX: 'auto', marginBottom: '20px' }}>
            {this.state.error?.toString()}
          </div>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', backgroundColor: '#046A38', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>,
);
