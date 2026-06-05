import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldProps;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

export function Input({ label, error, hint, leftIcon, className, id, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.errorWrap : ''}`}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          id={inputId}
          className={`${styles.input} ${leftIcon ? styles.withLeftIcon : ''} ${className ?? ''}`}
          {...rest}
        />
      </div>
      {error ? <span className={styles.error}>{error}</span> : hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

export function Select({ label, error, hint, children, className, id, ...rest }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.errorWrap : ''}`}>
        <select id={inputId} className={`${styles.input} ${styles.select} ${className ?? ''}`} {...rest}>
          {children}
        </select>
      </div>
      {error ? <span className={styles.error}>{error}</span> : hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

export function Textarea({ label, error, hint, className, id, ...rest }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.errorWrap : ''}`}>
        <textarea
          id={inputId}
          className={`${styles.input} ${styles.textarea} ${className ?? ''}`}
          rows={3}
          {...rest}
        />
      </div>
      {error ? <span className={styles.error}>{error}</span> : hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
