import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { accountService } from '../services/account.service';
import { categoryService } from '../services/category.service';
import { transactionService } from '../services/transaction.service';
import { budgetService } from '../services/budget.service';

export function useDataSync() {
  const user = useAuthStore((s) => s.user);
  const setAccounts = useDataStore((s) => s.setAccounts);
  const setCategories = useDataStore((s) => s.setCategories);
  const setTransactions = useDataStore((s) => s.setTransactions);
  const setBudgets = useDataStore((s) => s.setBudgets);
  const reset = useDataStore((s) => s.reset);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) {
      reset();
      return;
    }

    categoryService.ensureDefaults().catch((err) => {
      console.warn('[categoryService.ensureDefaults]', err);
    });

    const unsubAccounts = accountService.subscribe(setAccounts);
    const unsubCategories = categoryService.subscribe(setCategories);
    const unsubTransactions = transactionService.subscribe(setTransactions);
    const unsubBudgets = budgetService.subscribe(setBudgets);

    return () => {
      unsubAccounts();
      unsubCategories();
      unsubTransactions();
      unsubBudgets();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
}
