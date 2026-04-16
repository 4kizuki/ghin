import { exec } from './exec';

export const getRemoteUrl = async (
  cwd: string,
  remote: string,
): Promise<string> => {
  const output = await exec(['remote', 'get-url', remote], cwd);
  return output.trim();
};

export const getRemotes = async (cwd: string): Promise<string[]> => {
  const output = await exec(['remote'], cwd);
  return output.trim().split('\n').filter(Boolean);
};

export const addRemote = async (
  cwd: string,
  name: string,
  url: string,
): Promise<void> => {
  await exec(['remote', 'add', name, url], cwd);
};

export const fetchRemotes = async (
  cwd: string,
  remotes: string[],
): Promise<void> => {
  if (remotes.length === 0) {
    await exec(['fetch', '--all'], cwd);
  } else {
    for (const remote of remotes) {
      await exec(['fetch', remote], cwd);
    }
  }
};

export const getConfig = async (
  cwd: string,
  key: string,
): Promise<string | null> => {
  try {
    const output = await exec(['config', key], cwd);
    return output.trim() || null;
  } catch {
    return null;
  }
};

export const setLocalConfig = async (
  cwd: string,
  key: string,
  value: string,
): Promise<void> => {
  await exec(['config', '--local', key, value], cwd);
};
