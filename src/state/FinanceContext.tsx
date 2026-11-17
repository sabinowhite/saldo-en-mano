import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Action, demoState, financeReducer, FinanceState } from '../domain/finance';
import { InitialSetup, createInitialState } from '../domain/setup';
import { MovementSheet, Sheet } from '../components/MovementSheet';
import { Welcome } from '../screens/Welcome';
import { Onboarding } from '../screens/Onboarding';
import { FinanceRepository } from '../storage/repository';
import { openRepository } from '../storage/openRepository';
import { storageMessage } from '../storage/errors';
type Mode = 'demo' | 'local';
type ContextValue = {
  state: FinanceState; mode: Mode; busy: boolean; error: string | null; generation: number;
  openSheet: (s: Sheet) => void; dispatch: (a: Action) => Promise<void>;
  enterDemo: () => void; leaveDemo: () => void;
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
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const repository = useRef<FinanceRepository | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const boot = useCallback(() => {
    if (Platform.OS === 'web') return;
    void openRepository().then(async repo => ({ repo, saved: await repo.load() })).then(({ repo, saved }) => {
      if (!mounted.current) return;
      repository.current = repo; setStorageReady(true);
      if (saved) { setState(saved); setMode('local'); setGeneration(n => n + 1); setScreen('ready'); }
      else setScreen('welcome');
    }).catch(e => {
      if (mounted.current) { repository.current = null; setStorageReady(false); setError(storageMessage(e)); setScreen('welcome'); }
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
      const saved = await repository.current.initialize(createInitialState(input));
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
    } catch {
      const message = mode === 'local' ? 'No se pudo guardar. Se conservó el último estado confirmado; revisa el movimiento e intenta nuevamente.' : 'No se pudo aplicar el movimiento. Revisa los datos.';
      setError(message);
      throw new Error(message);
    } finally { inFlight.current = false; setBusy(false); }
  }
  if (screen === 'setup') return <Onboarding onFinish={initialize} onBack={() => setScreen('welcome')} />;
  if (screen !== 'ready' || !state) return <Welcome loading={screen === 'loading'} error={error} canStart={Platform.OS !== 'web' && storageReady && !error} onStart={() => setScreen('setup')} onDemo={enterDemo} onRetry={restart} />;
  return <Context.Provider value={{ state, mode, busy, error, generation, dispatch, openSheet: s => { if (!inFlight.current) setSheet(s); }, enterDemo, leaveDemo: restart }}>
    {children}
    {sheet && <MovementSheet key={generation} sheet={sheet} state={state} mode={mode} newId={randomUUID} onClose={() => { if (!inFlight.current) setSheet(null); }} onSubmit={async action => { await dispatch(action); setSheet(null); }} onReset={enterDemo} />}
  </Context.Provider>;
}
export function useFinance() {
  const value = useContext(Context);
  if (!value) throw new Error('FinanceProvider no está disponible.');
  return value;
}
