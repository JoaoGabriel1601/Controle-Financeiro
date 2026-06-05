import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import { App } from './App';
import { isSupabaseConfigured } from './services/supabase';

if (!isSupabaseConfigured) {
  document.body.innerHTML =
    '<div style="padding:2rem;font-family:sans-serif;color:#ef4444">' +
    '<strong>Configuração do Supabase ausente.</strong><br>' +
    'Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.' +
    '</div>';
  throw new Error('Supabase not configured — missing VITE_SUPABASE_* env vars');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
