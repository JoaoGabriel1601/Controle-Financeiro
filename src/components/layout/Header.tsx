import { useState } from 'react';
import { Menu, Moon, Sun, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { authService } from '../../services/auth.service';
import { toast } from '../ui/toastStore';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.info('Sessão encerrada');
    } catch {
      toast.error('Falha ao sair');
    }
  };

  return (
    <header className={styles.header}>
      <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Menu">
        <Menu size={20} />
      </button>

      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className={styles.userArea}>
          <button className={styles.userBtn} onClick={() => setMenuOpen((v) => !v)}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback}>
                <User size={16} />
              </span>
            )}
            <span className={styles.userName}>{user?.displayName ?? user?.email ?? 'Usuário'}</span>
          </button>

          {menuOpen && (
            <>
              <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu}>
                <div className={styles.menuHeader}>
                  <strong>{user?.displayName ?? 'Usuário'}</strong>
                  <span>{user?.email}</span>
                </div>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
