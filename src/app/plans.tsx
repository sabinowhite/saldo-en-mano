import { Plans } from '../screens/Plans';
import { useFinance } from '../state/FinanceContext';
export default function PlansRoute() {
  const { state, mode, openSheet } = useFinance();
  return <Plans state={state} mode={mode} onDeliver={id => openSheet({ kind: 'deliver', id })} onPay={id => openSheet({ kind: 'payment', id })} onDebt={id => openSheet({ kind: 'debt', id })} />;
}
