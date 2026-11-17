import { router } from 'expo-router';
import { Dashboard } from '../screens/Dashboard';
import { useDemo } from '../state/DemoContext';
export default function HomeRoute() {
  const { state, openSheet } = useDemo();
  return <Dashboard state={state} onNew={kind => openSheet({ kind })} onMovements={() => router.navigate('/movements')} onPlans={() => router.navigate('/plans')} />;
}
