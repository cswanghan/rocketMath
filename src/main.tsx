import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { AndroidApp } from './android/AndroidApp';
import { isAndroidApp } from './platform/native';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAndroidApp() ? <AndroidApp /> : <App />}
  </StrictMode>,
);
