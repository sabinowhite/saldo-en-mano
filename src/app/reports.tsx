import { Reports } from '../screens/Reports';
import { useFinance } from '../state/FinanceContext';
export default function ReportsRoute() { const { state } = useFinance(); return <Reports state={state} />; }
