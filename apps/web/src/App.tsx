import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';

import { AppProvider, useFireBuddy } from './app/FireBuddyProvider';
import AuthShell from './routes/AuthShell';

const AppShell = lazy(() => import('./routes/AppShell'));
const AddExpense = lazy(() => import('./routes/AddExpense'));
const AuthScreen = lazy(() => import('./routes/AuthScreen'));
const LegalPage = lazy(() => import('./routes/LegalPage'));
const ResetPassword = lazy(() => import('./routes/ResetPassword'));

const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';

function LoadingScreen({ message = 'Loading your session...' }: { message?: string }) {
  return (
    <AuthShell>
      <div className="auth-loading" role="status">
        <span className="auth-loading-spinner" aria-hidden="true" />
        <h1>Getting FireBuddy ready</h1>
        <p>{message}</p>
      </div>
    </AuthShell>
  );
}

function AppRoutes() {
  const { authLoading, session, syncError, syncStatus } = useFireBuddy();
  const location = useLocation();
  const backgroundPath = (location.state as { backgroundPath?: string } | null)?.backgroundPath;
  const routeLocation = location.pathname === '/add' ? backgroundPath ?? '/' : location;

  if (location.pathname === '/terms' || location.pathname === '/privacy') {
    return (
      <Suspense fallback={<LoadingScreen message="Loading legal information..." />}>
        <LegalPage kind={location.pathname === '/terms' ? 'terms' : 'privacy'} />
      </Suspense>
    );
  }

  if (!skipAuth && authLoading) {
    return <LoadingScreen />;
  }

  if (location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<LoadingScreen message="Checking your reset link..." />}>
        <ResetPassword />
      </Suspense>
    );
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
