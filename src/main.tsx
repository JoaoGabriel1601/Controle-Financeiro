import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import { App } from './App';
import { isFirebaseConfigured } from './services/firebase';

if (!isFirebaseConfigured) {
  document.body.innerHTML =
    '<div style="padding:2rem;font-family:sans-serif;color:#ef4444">' +
    '<strong>Configuração do Firebase ausente.</strong><br>' +
    'Verifique as variáveis de ambiente VITE_FIREBASE_* no arquivo .env.' +
    '</div>';
  throw new Error('Firebase not configured — missing VITE_FIREBASE_* env vars');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
