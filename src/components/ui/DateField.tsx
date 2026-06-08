import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './DateField.module.css';

// Iniciais dos dias da semana em pt-BR (domingo → sábado).
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT = 340;
const MARGIN = 8;

interface DateFieldProps {
  label?: string;
  /** Valor ISO `yyyy-MM-dd` (mesmo formato do `<input type="date">`). */
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  id?: string;
}

function parseValue(value: string): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/**
 * Campo de data com calendário próprio em pt-BR (dd/mm/aaaa, dias da semana
 * D S T Q Q S S). O calendário é renderizado num portal com posição fixa,
 * presa à viewport, para não ser recortado por modais/containers com overflow.
 */
export function DateField({ label, value, onChange, hint, error, id }: DateFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const selected = parseValue(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(selected ?? new Date());
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const computePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - MARGIN);
    left = Math.max(MARGIN, left);
    let top = rect.bottom + 6;
    // Abre para cima se não couber abaixo.
    if (top + POPOVER_HEIGHT > window.innerHeight - MARGIN && rect.top - POPOVER_HEIGHT - 6 > MARGIN) {
      top = rect.top - POPOVER_HEIGHT - 6;
    }
    setPos({ top, left });
  };

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        if (selected) setView(selected);
        computePosition();
      }
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
      if (e.key === 'Escape') setOpen(false);
    };
    // `true` (capture) para também reagir a scrolls de containers internos (modal).
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [open]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 0 }),
  });

  const pick = (d: Date) => {
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const display = selected ? format(selected, 'dd/MM/yyyy') : '';

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div
        ref={triggerRef}
        className={`${styles.inputWrap} ${error ? styles.errorWrap : ''} ${open ? styles.open : ''}`}
      >
        <button type="button" id={inputId} className={styles.input} onClick={toggleOpen}>
          <span className={display ? undefined : styles.placeholder}>{display || 'dd/mm/aaaa'}</span>
          <Calendar size={16} className={styles.calIcon} />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={styles.popover}
            role="dialog"
            aria-label="Selecionar data"
            style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
          >
            <div className={styles.popHead}>
              <button
                type="button"
                className={styles.nav}
                onClick={() => setView(addMonths(view, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.month}>
                {format(view, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <button
                type="button"
                className={styles.nav}
                onClick={() => setView(addMonths(view, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <span key={i} className={styles.weekday}>
                  {w}
                </span>
              ))}
            </div>

            <div className={styles.grid}>
              {days.map((d) => {
                const isSel = selected && isSameDay(d, selected);
                const isToday = isSameDay(d, new Date());
                const muted = !isSameMonth(d, view);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => pick(d)}
                    className={`${styles.day} ${isSel ? styles.daySelected : ''} ${
                      isToday ? styles.dayToday : ''
                    } ${muted ? styles.dayMuted : ''}`}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>

            <div className={styles.popFoot}>
              <button
                type="button"
                className={styles.footBtn}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Limpar
              </button>
              <button type="button" className={styles.footBtn} onClick={() => pick(new Date())}>
                Hoje
              </button>
            </div>
          </div>,
          document.body,
        )}

      {error ? (
        <span className={styles.error}>{error}</span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  );
}
