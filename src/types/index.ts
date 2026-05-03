import type { Timestamp } from 'firebase/firestore';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Timestamp;
  createdAt: Timestamp;
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
}

export type AccountInput = Omit<Account, 'id' | 'createdAt'>;
export type CategoryInput = Omit<Category, 'id'>;
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type BudgetInput = Omit<Budget, 'id'>;
