import { Plans } from '../screens/Plans';
import { useDemo } from '../state/DemoContext';
export default function PlansRoute() {
  const { state, openSheet } = useDemo();
  return <Plans state={state} onDeliver={id => openSheet({ kind: 'deliver', id })} onPay={id => openSheet({ kind: 'payment', id })} onDebt={id => openSheet({ kind: 'debt', id })} />;
}
