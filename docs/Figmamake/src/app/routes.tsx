import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './screens/Dashboard';
import { Transactions } from './screens/Transactions';
import { Categories } from './screens/Categories';
import { Profile } from './screens/Profile';
import { AddExpense } from './screens/AddExpense';
import { Analytics } from './screens/Analytics';
import { Accounts } from './screens/Accounts';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'transactions', Component: Transactions },
      { path: 'categories', Component: Categories },
      { path: 'profile', Component: Profile },
      { path: 'analytics', Component: Analytics },
      { path: 'accounts', Component: Accounts },
    ],
  },
  {
    path: '/add',
    Component: AddExpense,
  },
]);
