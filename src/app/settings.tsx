import { Settings } from '../screens/Settings';
import { useFinance } from '../state/FinanceContext';
export default function SettingsRoute() {
  const { state, mode, dispatch, openSheet, generation, enterDemo, leaveDemo, restore } = useFinance();
  return <Settings key={generation} state={state} mode={mode} onRestore={restore} onDemo={enterDemo} onLeaveDemo={leaveDemo} onSave={settings => dispatch({ type: 'settings', settings })} onReset={() => openSheet({ kind: 'reset' })} />;
}
