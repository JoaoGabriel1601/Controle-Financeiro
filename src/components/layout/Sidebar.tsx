import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Wallet,
  Target,
  FileText,
  Settings,
  X,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/contas', label: 'Contas', icon: Wallet },
  { to: '/orcamentos', label: 'Orçamentos', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {mobileOpen && <div className={styles.backdrop} onClick={onMobileClose} />}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logo}>💰</div>
          <div>
            <h1 className={styles.brandName}>Controle</h1>
            <span className={styles.brandTag}>Financeiro</span>
          </div>
          <button className={styles.closeMobile} onClick={onMobileClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onMobileClose}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <span>Versão 1.0</span>
        </div>
      </aside>
    </>
  );
}
