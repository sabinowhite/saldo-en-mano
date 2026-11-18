import { localDate } from '../domain/finance';
import { Settings } from '../screens/Settings';
import { useFinance } from '../state/FinanceContext';
export default function SettingsRoute() {
  const { state, mode, dispatch, openSheet, generation, enterDemo, leaveDemo, restore } = useFinance();
  return <Settings key={generation} state={state} mode={mode} onRestore={restore} onDemo={enterDemo} onLeaveDemo={leaveDemo} onExpectedSave={(id, cents, date) => dispatch({ type: 'edit-expected', id, cents, date })} onOpeningSave={opening => dispatch({ type: 'opening', opening, today: localDate() })} onSave={settings => dispatch({ type: 'settings', settings })} onReset={() => openSheet({ kind: 'reset' })} />;
}
