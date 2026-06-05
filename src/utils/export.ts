import { format } from 'date-fns';
import type { Transaction, Category, Account } from '../types';
import { formatCurrency, formatDate } from './format';
import { centsToReais } from './money';

interface ExportArgs {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  start: Date;
  end: Date;
}

function findCategoryName(id: string, categories: Category[]) {
  return categories.find((c) => c.id === id)?.name ?? '—';
}

function findAccountName(id: string, accounts: Account[]) {
  return accounts.find((a) => a.id === id)?.name ?? '—';
}

export function exportTransactionsCSV({ transactions, categories, accounts, start, end }: ExportArgs) {
  const header = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Valor'];
  const rows = transactions.map((tx) => [
    formatDate(tx.date),
    `"${tx.description.replace(/"/g, '""')}"`,
    tx.type === 'income' ? 'Receita' : tx.type === 'expense' ? 'Despesa' : 'Transferência',
    findCategoryName(tx.categoryId, categories),
    findAccountName(tx.accountId, accounts),
    centsToReais(tx.amount).toFixed(2).replace('.', ','),
  ]);

  const csv = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `extrato-${format(start, 'yyyy-MM-dd')}-a-${format(end, 'yyyy-MM-dd')}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportTransactionsPDF({ transactions, categories, start, end }: ExportArgs) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Extrato Financeiro', margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(`Período: ${formatDate(start)} a ${formatDate(end)}`, margin, y);
  y += 24;

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  doc.setTextColor(40);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receitas: ${formatCurrency(income)}`, margin, y);
  y += 16;
  doc.text(`Despesas: ${formatCurrency(expense)}`, margin, y);
  y += 16;
  doc.text(`Saldo: ${formatCurrency(income - expense)}`, margin, y);
  y += 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Data', margin, y);
  doc.text('Descrição', margin + 70, y);
  doc.text('Categoria', margin + 280, y);
  doc.text('Valor', pageWidth - margin, y, { align: 'right' });
  y += 8;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const tx of transactions) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    const isTransfer = tx.type === 'transfer';
    const cat = isTransfer ? 'Transferência' : findCategoryName(tx.categoryId, categories);
    const sign = isTransfer ? '' : tx.type === 'income' ? '+ ' : '- ';
    doc.setTextColor(60);
    doc.text(formatDate(tx.date), margin, y);
    doc.text(tx.description.slice(0, 32), margin + 70, y);
    doc.text(cat.slice(0, 18), margin + 280, y);
    if (isTransfer) doc.setTextColor(120);
    else doc.setTextColor(tx.type === 'income' ? 40 : 200, tx.type === 'income' ? 140 : 60, 60);
    doc.text(`${sign}${formatCurrency(tx.amount)}`, pageWidth - margin, y, { align: 'right' });
    y += 16;
  }

  doc.save(`extrato-${format(start, 'yyyy-MM-dd')}-a-${format(end, 'yyyy-MM-dd')}.pdf`);
}
