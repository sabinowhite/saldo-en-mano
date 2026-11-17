import { Settings } from '../screens/Settings';
import { useDemo } from '../state/DemoContext';
export default function SettingsRoute() {
  const { state, dispatch, openSheet, generation } = useDemo();
  return <Settings key={generation} state={state} onSave={settings => dispatch({ type: 'settings', settings })} onReset={() => openSheet({ kind: 'reset' })} />;
}
