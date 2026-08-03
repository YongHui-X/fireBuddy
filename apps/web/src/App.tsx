import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Wallet } from 'lucide-react';

import { AppProvider, useFireBuddy } from './app/FireBuddyProvider';

const AppShell = lazy(() => import('./routes/AppShell'));
const AddExpense = lazy(() => import('./routes/AddExpense'));
const AuthScreen = lazy(() => import('./routes/AuthScreen'));

const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';

function LoadingScreen({ message = 'Loading your session...' }: { message?: string }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <Wallet size={28} />
          <div>
            <h1>FireBuddy</h1>
            <p>{message}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AppRoutes() {
  const { authLoading, session, syncError, syncStatus } = useFireBuddy();
  const location = useLocation();
  const backgroundPath = (location.state as { backgroundPath?: string } | null)?.backgroundPath;
  const routeLocation = location.pathname === '/add' ? backgroundPath ?? '/' : location;

  if (!skipAuth && authLoading) {
    return <LoadingScreen />;
  }

  if (!skipAuth && !session) {
    return (
      <Suspense fallback={<LoadingScreen message="Loading sign in..." />}>
        <AuthScreen />
      </Suspense>
    );
  }

  return (
    <>
      {syncStatus === 'error' && syncError ? <div className="sync-banner">{syncError}</div> : null}
      <Suspense fallback={<LoadingScreen message="Loading FireBuddy..." />}>
        <Routes location={routeLocation}>
          <Route path="/*" element={<AppShell />} />
        </Routes>
        {location.pathname === '/add' ? <AddExpense /> : null}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
