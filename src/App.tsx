import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { authService } from './services/auth.service';
import { useDataSync } from './hooks/useDataSync';
import { Spinner } from './components/ui/Spinner';
import { ToastViewport } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TransactionsPage } from './pages/Transactions';
import { CategoriesPage } from './pages/Categories';
import { AccountsPage } from './pages/Accounts';
import { BudgetsPage } from './pages/Budgets';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';

export function App() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((u) => setUser(u));
    return unsubscribe;
  }, [setUser]);

  useDataSync();

  if (loading) {
    return <Spinner fullScreen label="Carregando..." />;
  }

  return (
    <BrowserRouter>
      <ToastViewport />
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transacoes" element={<TransactionsPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/contas" element={<AccountsPage />} />
            <Route path="/orcamentos" element={<BudgetsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
