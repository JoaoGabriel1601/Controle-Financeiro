import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Formata um valor em **centavos inteiros** como moeda (ex.: 1050 → "R$ 10,50"). */
export function formatCurrency(cents: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function toJsDate(value: string | Date | undefined | null): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatDate(value: string | Date, pattern = 'dd/MM/yyyy'): string {
  return format(toJsDate(value), pattern, { locale: ptBR });
}

export function formatMonthYear(value: string | Date): string {
  return format(toJsDate(value), "MMMM 'de' yyyy", { locale: ptBR });
}

export function monthKey(value: Date): string {
  return format(value, 'yyyy-MM');
}

export function parseMonthKey(key: string): Date {
  return parse(key, 'yyyy-MM', new Date());
}

export function dateInputValue(value: string | Date | undefined): string {
  if (!value) return format(new Date(), 'yyyy-MM-dd');
  return format(toJsDate(value), 'yyyy-MM-dd');
}

export function parseDateInput(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date());
}
