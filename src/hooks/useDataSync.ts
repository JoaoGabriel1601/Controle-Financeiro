import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { accountService } from '../services/account.service';
import { categoryService } from '../services/category.service';
import { transactionService } from '../services/transaction.service';
import { budgetService } from '../services/budget.service';
import { recurringService } from '../services/recurring.service';
import { toast } from '../components/ui/toastStore';

export function useDataSync() {
  const user = useAuthStore((s) => s.user);
  const setAccounts = useDataStore((s) => s.setAccounts);
  const setCategories = useDataStore((s) => s.setCategories);
  const setTransactions = useDataStore((s) => s.setTransactions);
  const setBudgets = useDataStore((s) => s.setBudgets);
  const setRecurring = useDataStore((s) => s.setRecurring);
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
    const unsubRecurring = recurringService.subscribe(setRecurring, onError);

    // Gera os lançamentos das recorrências vencidas (catch-up) ao abrir o app.
    // As inserções chegam de volta pelas assinaturas em tempo real.
    recurringService
      .processDue()
      .then((count) => {
        if (count > 0) {
          toast.success(
            `${count} ${count === 1 ? 'lançamento recorrente gerado' : 'lançamentos recorrentes gerados'}`,
          );
        }
      })
      .catch((err) => console.warn('[recurringService.processDue]', err));

    return () => {
      unsubAccounts();
      unsubCategories();
      unsubTransactions();
      unsubBudgets();
      unsubRecurring();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
}
