import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastTone } from './toastStore';
import styles from './Toast.module.css';

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

function ToastEntry({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timeout = setTimeout(() => dismiss(item.id), 4000);
    return () => clearTimeout(timeout);
  }, [item.id, dismiss]);

  return (
    <div className={`${styles.toast} ${styles[item.tone]}`} role={item.tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon}>{ICONS[item.tone]}</span>
      <span className={styles.message}>{item.message}</span>
      <button className={styles.close} onClick={() => dismiss(item.id)} aria-label="Fechar">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  return (
    <div className={styles.viewport}>
      {items.map((item) => (
        <ToastEntry key={item.id} item={item} />
      ))}
    </div>
  );
}
