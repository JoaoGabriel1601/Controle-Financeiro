import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { accountService } from '../services/account.service';
import { categoryService } from '../services/category.service';
import { transactionService } from '../services/transaction.service';
import { budgetService } from '../services/budget.service';
import { toast } from '../components/ui/toastStore';

export function useDataSync() {
  const user = useAuthStore((s) => s.user);
  const setAccounts = useDataStore((s) => s.setAccounts);
  const setCategories = useDataStore((s) => s.setCategories);
  const setTransactions = useDataStore((s) => s.setTransactions);
  const setBudgets = useDataStore((s) => s.setBudgets);
  const reset = useDataStore((s) => s.reset);

  const uid = user?.id ?? null;

  useEffect(() => {
    if (!uid) {
      reset();
      return;
    }

    let notified = false;
    const onError = () => {
      if (notified) return;
      notified = true;
      toast.error('Falha ao sincronizar seus dados. Verifique sua conexão.');
    };

    const unsubAccounts = accountService.subscribe(setAccounts, onError);
    const unsubCategories = categoryService.subscribe(setCategories, onError);
    const unsubTransactions = transactionService.subscribe(setTransactions, onError);
    const unsubBudgets = budgetService.subscribe(setBudgets, onError);

    return () => {
      unsubAccounts();
      unsubCategories();
      unsubTransactions();
      unsubBudgets();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
}
