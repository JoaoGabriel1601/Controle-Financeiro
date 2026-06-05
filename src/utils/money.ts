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

/** Arredonda para centavos inteiros — útil após divisões (ex.: médias). */
export function roundCents(cents: number): number {
  return Math.round(cents);
}
