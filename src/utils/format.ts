import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Timestamp } from 'firebase/firestore';

export function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function toJsDate(value: Timestamp | Date | undefined | null): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate();
  return new Date();
}

export function formatDate(value: Timestamp | Date, pattern = 'dd/MM/yyyy'): string {
  return format(toJsDate(value), pattern, { locale: ptBR });
}

export function formatMonthYear(value: Timestamp | Date): string {
  return format(toJsDate(value), "MMMM 'de' yyyy", { locale: ptBR });
}

export function monthKey(value: Date): string {
  return format(value, 'yyyy-MM');
}

export function parseMonthKey(key: string): Date {
  return parse(key, 'yyyy-MM', new Date());
}

export function dateInputValue(value: Timestamp | Date | undefined): string {
  if (!value) return format(new Date(), 'yyyy-MM-dd');
  return format(toJsDate(value), 'yyyy-MM-dd');
}

export function parseDateInput(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date());
}
