import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';
import styles from './Button.module.css';
import { springSnappy } from '../../utils/motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

// Omitimos handlers que conflitam entre os tipos do React e do motion.
type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDragStart' | 'onDragEnd' | 'onDrag'
> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const interactive = !disabled && !loading;

  return (
    <motion.button
      className={cls}
      disabled={disabled || loading}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      transition={springSnappy}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </motion.button>
  );
}
