import 'server-only';
import { z } from 'zod';
import { git } from './git';
import { prisma } from './prisma';

const remotesSchema = z.array(z.string());

class AutoFetchManager {
  private intervals = new Map<string, NodeJS.Timeout>();
  private initialized = false;

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const repos = await prisma.repository.findMany({
      where: { autoFetch: true },
    });

    for (const repo of repos) {
      const remotes =
        repo.fetchRemotes === ''
          ? []
          : remotesSchema.parse(JSON.parse(repo.fetchRemotes));
      this.register(repo.path, remotes);
    }
  }

  register(repoPath: string, remotes: string[]): void {
    this.unregister(repoPath);

    const intervalId = setInterval(() => {
      git.fetchRemotes(repoPath, remotes).catch(() => {
        // silently fail — repo may be unavailable
      });
    }, 60_000);

    this.intervals.set(repoPath, intervalId);
  }

  unregister(repoPath: string): void {
    const existing = this.intervals.get(repoPath);
    if (existing) {
      clearInterval(existing);
      this.intervals.delete(repoPath);
    }
  }
}

// Singleton via globalThis to survive HMR in dev
const GLOBAL_KEY = '_autoFetchManager';

const getOrCreateManager = (): AutoFetchManager => {
  const existing: unknown = Reflect.get(globalThis, GLOBAL_KEY);
  if (existing instanceof AutoFetchManager) return existing;
  const manager = new AutoFetchManager();
  Reflect.set(globalThis, GLOBAL_KEY, manager);
  return manager;
};

export const autoFetchManager = getOrCreateManager();

void autoFetchManager.ensureInitialized();
