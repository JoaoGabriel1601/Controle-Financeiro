import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: number;
  fullScreen?: boolean;
  label?: string;
}

export function Spinner({ size = 28, fullScreen = false, label }: SpinnerProps) {
  const content = (
    <div className={styles.wrapper}>
      <span className={styles.spinner} style={{ width: size, height: size, borderWidth: size / 8 }} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );

  if (fullScreen) {
    return <div className={styles.fullScreen}>{content}</div>;
  }
  return content;
}
