import { create } from 'zustand';
import type { Account, Budget, Category, Loan, RecurringTransaction, Transaction } from '../types';

interface DataState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  loans: Loan[];
  loaded: {
    accounts: boolean;
    categories: boolean;
    transactions: boolean;
    budgets: boolean;
    recurring: boolean;
    loans: boolean;
  };
  setAccounts: (items: Account[]) => void;
  setCategories: (items: Category[]) => void;
  setTransactions: (items: Transaction[]) => void;
  setBudgets: (items: Budget[]) => void;
  setRecurring: (items: RecurringTransaction[]) => void;
  setLoans: (items: Loan[]) => void;
  reset: () => void;
}

const emptyLoaded = {
  accounts: false,
  categories: false,
  transactions: false,
  budgets: false,
  recurring: false,
  loans: false,
};

export const useDataStore = create<DataState>((set) => ({
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  recurring: [],
  loans: [],
  loaded: emptyLoaded,
  setAccounts: (accounts) =>
    set((state) => ({ accounts, loaded: { ...state.loaded, accounts: true } })),
  setCategories: (categories) =>
    set((state) => ({ categories, loaded: { ...state.loaded, categories: true } })),
  setTransactions: (transactions) =>
    set((state) => ({ transactions, loaded: { ...state.loaded, transactions: true } })),
  setBudgets: (budgets) => set((state) => ({ budgets, loaded: { ...state.loaded, budgets: true } })),
  setRecurring: (recurring) =>
    set((state) => ({ recurring, loaded: { ...state.loaded, recurring: true } })),
  setLoans: (loans) => set((state) => ({ loans, loaded: { ...state.loaded, loans: true } })),
  reset: () =>
    set({
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      recurring: [],
      loans: [],
      loaded: emptyLoaded,
    }),
}));
