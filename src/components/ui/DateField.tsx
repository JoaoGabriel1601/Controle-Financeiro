import { useEffect, useId, useRef, useState } from 'react';
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
 * D S T Q Q S S). Substitui o `<input type="date">`, cujo picker nativo não
 * respeita o locale da página de forma confiável.
 */
export function DateField({ label, value, onChange, hint, error, id }: DateFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const selected = parseValue(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Abre o calendário já no mês do valor selecionado.
  const toggleOpen = () => {
    setOpen((wasOpen) => {
      if (!wasOpen && selected) setView(selected);
      return !wasOpen;
    });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
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
    <div className={styles.field} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.errorWrap : ''} ${open ? styles.open : ''}`}>
        <button type="button" id={inputId} className={styles.input} onClick={toggleOpen}>
          <span className={display ? undefined : styles.placeholder}>{display || 'dd/mm/aaaa'}</span>
          <Calendar size={16} className={styles.calIcon} />
        </button>
      </div>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Selecionar data">
          <div className={styles.popHead}>
            <button
              type="button"
              className={styles.nav}
              onClick={() => setView(addMonths(view, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.month}>{format(view, "MMMM 'de' yyyy", { locale: ptBR })}</span>
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
        </div>
      )}

      {error ? (
        <span className={styles.error}>{error}</span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  );
}
