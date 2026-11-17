import { createContext, PropsWithChildren, useContext, useReducer, useRef, useState } from 'react';
import { Action, demoState, financeReducer, FinanceState } from '../domain/finance';
import { MovementSheet, Sheet } from '../components/MovementSheet';
type DemoContextValue = { state: FinanceState; openSheet: (s: Sheet) => void; dispatch: (a: Action) => void; generation: number };
const DemoContext = createContext<DemoContextValue | null>(null);
function Session({ children, onReset, generation }: PropsWithChildren<{ onReset: () => void; generation: number }>) {
  const [state, dispatch] = useReducer(financeReducer, undefined, () => demoState());
  const [sheet, openSheet] = useState<Sheet | null>(null);
  const counter = useRef(0);
  return <DemoContext.Provider value={{ state, dispatch, openSheet, generation }}>
    {children}
    {sheet && <MovementSheet sheet={sheet} state={state} newId={() => `session-${Date.now()}-${++counter.current}`} onClose={() => openSheet(null)} onSubmit={action => { dispatch(action); openSheet(null); }} onReset={onReset} />}
  </DemoContext.Provider>;
}
export function DemoProvider({ children }: PropsWithChildren) {
  const [generation, setGeneration] = useState(0);
  return <Session key={generation} generation={generation} onReset={() => setGeneration(n => n + 1)}>{children}</Session>;
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider no está disponible.');
  return context;
}
