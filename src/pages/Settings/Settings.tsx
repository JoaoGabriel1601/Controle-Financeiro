import { Moon, Sun, LogOut, User, Mail, Smartphone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { authService } from '../../services/auth.service';
import { toast } from '../../components/ui/toastStore';
import styles from './Settings.module.css';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, toggle, setTheme } = useThemeStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.info('Sessão encerrada');
    } catch {
      toast.error('Falha ao sair');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Configurações</h1>
          <p className={styles.subtitle}>Gerencie sua conta e preferências do app.</p>
        </div>
      </header>

      <Card title="Perfil" subtitle="Suas informações de conta">
        <div className={styles.profile}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>
              <User size={28} />
            </div>
          )}
          <div className={styles.profileInfo}>
            <strong>{user?.displayName ?? 'Usuário'}</strong>
            <span><Mail size={13} /> {user?.email}</span>
          </div>
        </div>
      </Card>

      <Card title="Aparência" subtitle="Escolha entre tema claro ou escuro">
        <div className={styles.themeRow}>
          <button
            onClick={() => setTheme('light')}
            className={`${styles.themeOption} ${theme === 'light' ? styles.active : ''}`}
          >
            <Sun size={18} />
            <span>Claro</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`${styles.themeOption} ${theme === 'dark' ? styles.active : ''}`}
          >
            <Moon size={18} />
            <span>Escuro</span>
          </button>
          <Button variant="ghost" size="sm" onClick={toggle}>
            Alternar
          </Button>
        </div>
      </Card>

      <Card title="Aplicativo móvel" subtitle="Instale o app Android no seu dispositivo">
        <div className={styles.mobileRow}>
          <Smartphone size={28} />
          <div>
            <strong>Em breve no Android</strong>
            <span>O APK estará disponível em uma próxima versão.</span>
          </div>
        </div>
      </Card>

      <Card title="Conta" subtitle="Encerrar sessão atual">
        <Button variant="danger" leftIcon={<LogOut size={16} />} onClick={handleLogout}>
          Sair da conta
        </Button>
      </Card>
    </div>
  );
}
