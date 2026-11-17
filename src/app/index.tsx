import { router } from 'expo-router';
import { Dashboard } from '../screens/Dashboard';
import { useFinance } from '../state/FinanceContext';
export default function HomeRoute() {
  const { state, openSheet } = useFinance();
  return <Dashboard state={state} onNew={kind => openSheet({ kind })} onMovements={() => router.navigate('/movements')} onPlans={() => router.navigate('/plans')} />;
}
