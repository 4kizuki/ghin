import { exec } from './exec';

export const commit = async (cwd: string, message: string): Promise<string> => {
  const output = await exec(['commit', '-m', message], cwd);
  return output;
};

export const push = async (
  cwd: string,
  setUpstream?: boolean,
  remoteBranch?: string,
): Promise<string> => {
  const args = ['push'];
  if (setUpstream) {
    const localBranch = (
      await exec(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
    ).trim();
    if (remoteBranch && remoteBranch !== localBranch) {
      args.push('-u', 'origin', `${localBranch}:${remoteBranch}`);
    } else {
      args.push('-u', 'origin', localBranch);
    }
  }
  return exec(args, cwd);
};

export const pull = async (
  cwd: string,
  remote: string = 'origin',
  branch: string = 'main',
): Promise<string> => {
  return exec(['pull', remote, branch], cwd);
};

export const pullCurrentBranch = async (cwd: string): Promise<string> => {
  return exec(['pull'], cwd);
};
