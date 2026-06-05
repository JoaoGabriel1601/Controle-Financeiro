import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { authService } from './services/auth.service';
import { useDataSync } from './hooks/useDataSync';
import { Spinner } from './components/ui/Spinner';
import { ToastViewport } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';

// Cada página é um chunk próprio, carregado sob demanda (mantém recharts/jspdf
// fora do bundle inicial).
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const TransactionsPage = lazy(() =>
  import('./pages/Transactions').then((m) => ({ default: m.TransactionsPage })),
);
const CategoriesPage = lazy(() =>
  import('./pages/Categories').then((m) => ({ default: m.CategoriesPage })),
);
const AccountsPage = lazy(() =>
  import('./pages/Accounts').then((m) => ({ default: m.AccountsPage })),
);
const BudgetsPage = lazy(() => import('./pages/Budgets').then((m) => ({ default: m.BudgetsPage })));
const RecurringPage = lazy(() =>
  import('./pages/Recurring').then((m) => ({ default: m.RecurringPage })),
);
const ReportsPage = lazy(() => import('./pages/Reports').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.SettingsPage })),
);

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
      <ErrorBoundary>
        <Suspense fallback={<Spinner fullScreen label="Carregando..." />}>
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
                <Route path="/recorrentes" element={<RecurringPage />} />
                <Route path="/relatorios" element={<ReportsPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
