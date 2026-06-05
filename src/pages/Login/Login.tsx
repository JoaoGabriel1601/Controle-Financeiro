import { useState, type FormEvent } from 'react';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/toastStore';
import styles from './Login.module.css';

type Mode = 'login' | 'register';

export function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await authService.loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('Informe seu nome');
        if (password.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres');
        await authService.registerWithEmail(name, email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(translateAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await authService.loginWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no login com Google';
      const friendly = translateAuthError(msg);
      setError(friendly);
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>💰</div>
          <h1 className={styles.title}>Controle Financeiro</h1>
          <p className={styles.subtitle}>
            {mode === 'login'
              ? 'Acesse sua conta para gerenciar suas finanças'
              : 'Crie uma conta gratuita para começar'}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleEmail}>
          {mode === 'register' && (
            <Input
              label="Nome"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<UserIcon size={16} />}
              autoComplete="name"
              required
            />
          )}
          <Input
            type="email"
            label="E-mail"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            autoComplete="email"
            required
          />
          <Input
            type="password"
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />

          {error && <div className={styles.error}>{error}</div>}

          <Button type="submit" loading={submitting} fullWidth size="lg">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <div className={styles.divider}>
          <span>ou continue com</span>
        </div>

        <Button variant="secondary" fullWidth size="lg" onClick={handleGoogle} disabled={submitting}>
          <GoogleIcon /> Google
        </Button>

        <p className={styles.switch}>
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function translateAuthError(msg: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/invalid-credential': 'Credenciais inválidas',
    'auth/email-already-in-use': 'Este e-mail já está em uso',
    'auth/weak-password': 'Senha muito fraca',
    'auth/popup-closed-by-user': 'Janela fechada antes de concluir',
    'auth/network-request-failed': 'Falha de conexão',
  };
  for (const key of Object.keys(map)) {
    if (msg.includes(key)) return map[key];
  }
  return msg;
}
