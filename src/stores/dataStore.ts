import { create } from 'zustand';
import type { Account, Budget, Category, Transaction } from '../types';

interface DataState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  loaded: {
    accounts: boolean;
    categories: boolean;
    transactions: boolean;
    budgets: boolean;
  };
  setAccounts: (items: Account[]) => void;
  setCategories: (items: Category[]) => void;
  setTransactions: (items: Transaction[]) => void;
  setBudgets: (items: Budget[]) => void;
  reset: () => void;
}

const emptyLoaded = {
  accounts: false,
  categories: false,
  transactions: false,
  budgets: false,
};

export const useDataStore = create<DataState>((set) => ({
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  loaded: emptyLoaded,
  setAccounts: (accounts) =>
    set((state) => ({ accounts, loaded: { ...state.loaded, accounts: true } })),
  setCategories: (categories) =>
    set((state) => ({ categories, loaded: { ...state.loaded, categories: true } })),
  setTransactions: (transactions) =>
    set((state) => ({ transactions, loaded: { ...state.loaded, transactions: true } })),
  setBudgets: (budgets) => set((state) => ({ budgets, loaded: { ...state.loaded, budgets: true } })),
  reset: () =>
    set({
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      loaded: emptyLoaded,
    }),
}));
