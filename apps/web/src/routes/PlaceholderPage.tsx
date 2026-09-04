import { ClipboardList, Flag } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageToolbar } from '../components/PageToolbar';

/** Keep approved later milestones navigable without presenting them as shipped. */
export default function PlaceholderPage({ kind }: { kind: 'plan' | 'goals' }) {
  const navigate = useNavigate();
  const isPlan = kind === 'plan';
  return <main className="page foundation-management-page"><PageToolbar title={isPlan ? 'Spending Plan' : 'Life Goals'} description="This area is planned but not available yet." backAction={() => navigate(-1)} /><section className="white-card placeholder-card"><span>{isPlan ? <ClipboardList size={32} /> : <Flag size={32} />}</span><h3>{isPlan ? 'Period based planning comes next' : 'Goal tracking follows the dashboard foundation'}</h3><p>{isPlan ? 'Current category budgets remain available. Overall limits, projected spending, and rollover are not implemented yet.' : 'Saved goals, target dates, goal contributions, and progress statuses are not implemented yet.'}</p><button className="secondary-button" type="button" onClick={() => navigate(isPlan ? '/categories' : '/fire')}>{isPlan ? 'Manage category budgets' : 'Review FIRE setup'}</button></section></main>;
}
