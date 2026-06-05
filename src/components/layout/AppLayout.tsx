import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Spinner } from '../ui/Spinner';
import { useDataStore } from '../../stores/dataStore';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loaded = useDataStore((s) => s.loaded);
  const ready = loaded.accounts && loaded.categories && loaded.transactions && loaded.budgets;

  return (
    <div className={styles.shell}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className={styles.main}>
        <Header onToggleSidebar={() => setMobileOpen((v) => !v)} />
        <main className={styles.content}>
          {ready ? <Outlet /> : <Spinner fullScreen label="Carregando seus dados..." />}
        </main>
      </div>
    </div>
  );
}
