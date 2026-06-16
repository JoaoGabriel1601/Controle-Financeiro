import { useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { springSmooth } from '../../utils/motion';
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
          {ready ? <AnimatedOutlet /> : <Spinner fullScreen label="Carregando seus dados..." />}
        </main>
      </div>
    </div>
  );
}

// Anima a troca de página mantendo sidebar/header parados.
// useOutlet() devolve o elemento da rota atual; ao mudar de rota o
// AnimatePresence segura a página anterior (capturada por valor) para ela
// fazer a saída antes da nova entrar. `prefers-reduced-motion` é respeitado
// automaticamente pelo motion.
function AnimatedOutlet() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={springSmooth}
      >
        {element}
      </motion.div>
    </AnimatePresence>
  );
}
