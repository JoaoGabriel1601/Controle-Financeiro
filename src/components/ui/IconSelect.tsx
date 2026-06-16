import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import styles from './IconSelect.module.css';

export interface IconSelectOption {
  value: string;
  label: string;
  /** Ícone/logo à esquerda do rótulo. */
  icon?: ReactNode;
}

interface IconSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  label?: string;
  placeholder?: string;
  hint?: string;
  id?: string;
}

const MARGIN = 8;
const MAX_POPOVER_HEIGHT = 300;

/**
 * Dropdown próprio que, ao contrário do `<select>` nativo, renderiza um ícone
 * ao lado de cada opção (logos de banco/bandeira, ícones de método de
 * pagamento). O painel abre num portal com posição fixa, preso à viewport,
 * seguindo o mesmo padrão do DateField.
 */
export function IconSelect({
  value,
  onChange,
  options,
  label,
  placeholder,
  hint,
  id,
}: IconSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const computePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN));
    let top = rect.bottom + 6;
    // Abre para cima se não couber abaixo.
    const estHeight = Math.min(options.length * 40 + 8, MAX_POPOVER_HEIGHT);
    if (top + estHeight > window.innerHeight - MARGIN && rect.top - estHeight - 6 > MARGIN) {
      top = rect.top - estHeight - 6;
    }
    setPos({ top, left, width });
  };

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) computePosition();
      return !wasOpen;
    });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(t) &&
        popoverRef.current &&
        !popoverRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Captura + stopPropagation: o Esc fecha só o dropdown, sem chegar a um
        // modal que também escute Esc (que fecharia junto).
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div ref={triggerRef} className={`${styles.inputWrap} ${open ? styles.open : ''}`}>
        <button
          type="button"
          id={inputId}
          className={styles.input}
          onClick={toggleOpen}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected?.icon && <span className={styles.triggerIcon}>{selected.icon}</span>}
          <span className={selected ? styles.value : styles.placeholder}>
            {selected?.label ?? placeholder ?? 'Selecione...'}
          </span>
          <ChevronDown size={16} className={styles.chevron} />
        </button>
      </div>

      {hint && <span className={styles.hint}>{hint}</span>}

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={styles.popover}
            role="listbox"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: MAX_POPOVER_HEIGHT }}
          >
            {options.map((opt) => {
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  className={`${styles.option} ${isSel ? styles.optionActive : ''}`}
                  onClick={() => pick(opt.value)}
                >
                  <span className={styles.optionIcon}>{opt.icon}</span>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {isSel && <Check size={15} className={styles.optionCheck} />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
