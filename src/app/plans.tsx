import { Plans } from '../screens/Plans';
import { useFinance } from '../state/FinanceContext';
export default function PlansRoute() {
  const { state, openSheet } = useFinance();
  return <Plans state={state} onDeleteReserve={id => openSheet({ kind: 'plan', entity: 'reserve', id, remove: true })} onEdit={(entity, id) => openSheet({ kind: 'plan', entity, id })} onEntry={id => openSheet({ kind: 'edit', id })} onDeliver={id => openSheet({ kind: 'deliver', id })} onPay={id => openSheet({ kind: 'payment', id })} onDebt={id => openSheet({ kind: 'debt', id })} />;
}
