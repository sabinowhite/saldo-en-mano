import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Action, demoState, financeReducer, FinanceState, FinanceError, localDate } from '../domain/finance';
import { InitialSetup, createInitialState } from '../domain/setup';
import { MovementSheet, MovementSheetValue } from '../components/MovementSheet';
import { PlanEditor, PlanSheet } from '../components/PlanEditor';
import { authenticate, lockEnabled } from '../services/privacy';
import { watchDrive } from '../services/drive';
import { syncReminders } from '../services/reminders';
import { automaticBackup } from '../services/backup';
import { RestoreBackup } from '../components/RestoreBackup';
import { PrivacyGate } from '../components/PrivacyGate';
import { Welcome } from '../screens/Welcome';
import { Onboarding } from '../screens/Onboarding';
import { FinanceRepository } from '../storage/repository';
import { openRepository } from '../storage/openRepository';
import { storageMessage } from '../storage/errors';
type Mode = 'demo' | 'local';
type Sheet = MovementSheetValue | PlanSheet;
type ContextValue = {
  state: FinanceState; mode: Mode; busy: boolean; error: string | null; generation: number;
  openSheet: (s: Sheet) => void; dispatch: (a: Action) => Promise<void>;
  enterDemo: () => void; leaveDemo: () => void; restore: (state: FinanceState) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function FinanceProvider({ children }: PropsWithChildren) {
  const [screen, setScreen] = useState<'loading' | 'welcome' | 'setup' | 'ready'>(Platform.OS === 'web' ? 'welcome' : 'loading');
  const [state, setState] = useState<FinanceState | null>(null);
  const [mode, setMode] = useState<Mode>('demo');
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const repository = useRef<FinanceRepository | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const boot = useCallback(() => {
    if (Platform.OS === 'web') return;
    void openRepository().then(async repo => { repository.current = repo; const saved = await repo.load(); return { repo, saved: saved ? await repo.apply({ type: 'tick', today: localDate() }) : null }; }).then(({ repo, saved }) => {
      if (!mounted.current) return;
      repository.current = repo; setStorageReady(true);
      if (saved) { setState(saved); setMode('local'); setGeneration(n => n + 1); setScreen('ready'); }
      else setScreen('welcome');
    }).catch(e => {
      if (mounted.current) { setStorageReady(!!repository.current); setError(storageMessage(e)); setScreen('welcome'); }
    });
  }, []);
  useEffect(() => { mounted.current = true; boot(); return () => { mounted.current = false; }; }, [boot]);
  function restart() {
    if (inFlight.current) return;
    setError(null); setSheet(null);
    setScreen(Platform.OS === 'web' ? 'welcome' : 'loading');
    boot();
  }
  function enterDemo() {
    if (inFlight.current) return;
    setState(demoState()); setMode('demo'); setError(null); setSheet(null); setGeneration(n => n + 1); setScreen('ready');
  }
  async function initialize(input: InitialSetup) {
    if (inFlight.current) return;
    if (!repository.current) throw new Error('El almacenamiento cifrado no está disponible.');
    inFlight.current = true;
    try {
      const saved = await repository.current.initialize(financeReducer(createInitialState(input), { type: 'tick', today: localDate() }));
      setState(saved); setMode('local'); setGeneration(n => n + 1); setError(null); setScreen('ready');
    } catch (e) { throw new Error(storageMessage(e)); }
    finally { inFlight.current = false; }
  }
  async function dispatch(action: Action) {
    if (!state || inFlight.current) throw new Error('Hay un guardado en curso. Espera un momento.');
    inFlight.current = true; setBusy(true); setError(null);
    try {
      // UI balances only change after COMMIT. Demo never calls the disk repository.
      const next = mode === 'local' ? await repository.current!.apply(action) : financeReducer(state, action);
      setState(next);
    } catch (error) {
      const message = error instanceof FinanceError ? error.message : mode === 'local' ? 'No se pudo guardar. Se conservó el último estado confirmado; revisa el movimiento e intenta nuevamente.' : 'No se pudo aplicar el movimiento. Revisa los datos.';
      setError(message);
      throw new Error(message);
    } finally { inFlight.current = false; setBusy(false); }
  }
  async function restore(candidate: FinanceState) {
    if (inFlight.current || !repository.current) throw new Error('El almacenamiento seguro no está disponible.');
    inFlight.current = true; setBusy(true);
    try { if (await lockEnabled() && !await authenticate()) throw new Error('No se confirmó tu identidad.'); const saved = await repository.current.restore(candidate); setState(saved); setMode('local'); setGeneration(n => n + 1); setScreen('ready'); setError(null); }
    catch { throw new Error('No se pudo restaurar. No se confirmó ningún cambio.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  useEffect(() => { if (mode === 'local' && screen === 'ready') return watchDrive(); }, [mode, screen]);
  useEffect(() => {
    if (mode !== 'local' || screen !== 'ready' || !state) return;
    const timer = setTimeout(() => { void automaticBackup(state).catch(() => setError('Los datos se guardaron, pero la copia local de respaldo está pendiente.')); void syncReminders(state).catch(() => setError('Los datos se guardaron, pero no se pudieron programar los recordatorios.')); }, 1200);
    return () => clearTimeout(timer);
  }, [state, screen, mode]);
  useEffect(() => {
    if (screen !== 'ready') return;
    function refresh() {
      if (AppState.currentState !== 'active' || inFlight.current) return;
      if (mode === 'local' && repository.current) {
        inFlight.current = true;
        void repository.current.apply({ type: 'tick', today: localDate() }).then(next => setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)).catch(() => setError('No se pudieron actualizar los cargos programados. Reintenta al volver a abrir la app.')).finally(() => { inFlight.current = false; });
      } else setState(previous => previous ? financeReducer(previous, { type: 'tick', today: localDate() }) : previous);
    }
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') refresh(); });
    const timer = setInterval(refresh, 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [screen, mode]);
  if (screen === 'setup') return <Onboarding onFinish={initialize} onBack={() => setScreen('welcome')} />;
  if (screen !== 'ready' || !state) return <><Welcome loading={screen === 'loading'} error={error} canStart={Platform.OS !== 'web' && storageReady && !error} onStart={() => setScreen('setup')} onDemo={enterDemo} onRetry={restart} onRestore={storageReady ? () => setRestoring(true) : undefined} />{restoring && <RestoreBackup onRestore={restore} onClose={() => setRestoring(false)} />}</>;
  return <Context.Provider value={{ state, mode, busy, error, generation, dispatch, openSheet: s => { if (!inFlight.current) setSheet(s); }, enterDemo, leaveDemo: restart, restore }}>
    <PrivacyGate mode={mode}>{children}
    {sheet?.kind === 'plan' ? <PlanEditor key={generation} sheet={sheet} state={state} onClose={() => { if (!inFlight.current) setSheet(null); }} onSubmit={async action => { await dispatch(action); setSheet(null); }} /> : sheet && <MovementSheet key={generation} sheet={sheet} state={state} mode={mode} newId={randomUUID} onClose={() => { if (!inFlight.current) setSheet(null); }} onSubmit={async action => { await dispatch(action); setSheet(null); }} onReset={enterDemo} />}</PrivacyGate>
  </Context.Provider>;
}
export function useFinance() {
  const value = useContext(Context);
  if (!value) throw new Error('FinanceProvider no está disponible.');
  return value;
}
