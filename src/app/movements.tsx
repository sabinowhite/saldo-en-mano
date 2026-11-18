import { View } from 'react-native';
import { Button } from '../components/ui';
import { Movements } from '../screens/Movements';
import { useFinance } from '../state/FinanceContext';
export default function MovementsRoute() {
  const { state, mode, openSheet } = useFinance();
  return <View style={{ gap: 20 }}><Movements onEdit={id => openSheet({ kind: 'edit', id })} onDelete={id => openSheet({ kind: 'delete', id })} entries={state.entries} mode={mode} /><Button label="Registrar gasto" icon="add" onPress={() => openSheet({ kind: 'expense' })} /></View>;
}
