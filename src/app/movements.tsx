import { View } from 'react-native';
import { Button } from '../components/ui';
import { Movements } from '../screens/Movements';
import { useDemo } from '../state/DemoContext';
export default function MovementsRoute() {
  const { state, openSheet } = useDemo();
  return <View style={{ gap: 20 }}><Movements entries={state.entries} /><Button label="Registrar gasto" icon="add" onPress={() => openSheet({ kind: 'expense' })} /></View>;
}
