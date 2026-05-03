import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}

export function Card({
  title,
  subtitle,
  action,
  padded = true,
  children,
  className,
  ...rest
}: CardProps) {
  return (
    <div className={`${styles.card} ${padded ? styles.padded : ''} ${className ?? ''}`} {...rest}>
      {(title || action) && (
        <header className={styles.header}>
          <div className={styles.titleArea}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
