import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
}

export function Badge({ tone = 'neutral', icon, children, className, ...rest }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${className ?? ''}`} {...rest}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
