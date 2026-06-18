import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/theme.css';
import { App } from './App';
import { isSupabaseConfigured } from './services/supabase';

// Service worker do PWA: cache offline + atualização automática (autoUpdate)
// quando um novo build é publicado.
registerSW({ immediate: true });

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
