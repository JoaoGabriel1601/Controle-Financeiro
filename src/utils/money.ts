/**
 * Valores monetários são armazenados como **centavos inteiros** (ex.: R$ 10,50 = 1050).
 * Isso elimina a imprecisão de ponto flutuante (somas e subtrações viram aritmética
 * de inteiros). A conversão para/de reais acontece apenas nas bordas:
 * - ao ler o que o usuário digitou (reais → centavos) em `reaisToCents`;
 * - ao preencher um formulário de edição (centavos → reais) em `centsToReais`;
 * - ao exibir, em `formatCurrency` (que recebe centavos).
 */

/** Converte um valor em reais (como digitado) para centavos inteiros. */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Converte centavos inteiros para reais (para edição em formulários). */
export function centsToReais(cents: number): number {
  return cents / 100;
}

/**
 * Converte o texto digitado num campo de valor em reais como número.
 * Aceita vírgula ou ponto como separador decimal (essencial no mobile pt-BR,
 * onde o teclado oferece vírgula) e ignora separadores de milhar.
 * Retorna `NaN` quando o texto está vazio ou é inválido, para que o chamador
 * decida o que fazer (ex.: tratar como 0 ou exibir erro de validação).
 */
export function parseMoneyInput(value: string): number {
  const cleaned = value.trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return NaN;
  // O último separador ('.' ou ',') é o decimal; os demais são de milhar.
  const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  const normalized =
    lastSep === -1
      ? cleaned
      : `${cleaned.slice(0, lastSep).replace(/[.,]/g, '')}.${cleaned.slice(lastSep + 1).replace(/[.,]/g, '')}`;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : NaN;
}

/** Arredonda para centavos inteiros — útil após divisões (ex.: médias). */
export function roundCents(cents: number): number {
  return Math.round(cents);
}
