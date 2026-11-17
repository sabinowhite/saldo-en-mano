import { PropsWithChildren } from 'react';
export function PrivacyGate({ children }: PropsWithChildren<{ mode: 'local' | 'demo' }>) { return children; }
