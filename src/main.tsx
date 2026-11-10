import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootNativeShell } from './native';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './ui/styles.css';

void bootNativeShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
