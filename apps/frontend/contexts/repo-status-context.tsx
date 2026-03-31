'use client';

import {
  createContext,
  useContext,
  type ReactNode,
  type FunctionComponent,
} from 'react';
import type { RepoStatus } from '@/lib/git';

type RepoStatusContextValue = {
  repoPath: string;
  status: RepoStatus | null;
  refreshStatus: () => Promise<void>;
};

const RepoStatusContext = createContext<RepoStatusContextValue | null>(null);

export const useRepoStatus = (): RepoStatusContextValue => {
  const ctx = useContext(RepoStatusContext);
  if (!ctx)
    throw new Error('useRepoStatus must be used within RepoStatusProvider');
  return ctx;
};

export const RepoStatusProvider: FunctionComponent<{
  value: RepoStatusContextValue;
  children: ReactNode;
}> = ({ value, children }) => {
  return (
    <RepoStatusContext.Provider value={value}>
      {children}
    </RepoStatusContext.Provider>
  );
};
