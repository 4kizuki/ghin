import { exec as execCb, execFile } from 'node:child_process';

export const exec = (
  args: string[],
  cwd: string,
  options?: string | { stdinData?: string; expectedError?: RegExp },
): Promise<string> =>
  new Promise((resolve, reject) => {
    const stdinData =
      typeof options === 'string' ? options : options?.stdinData;
    const expectedError =
      typeof options === 'object' ? options?.expectedError : undefined;

    const child = execFile(
      'git',
      args,
      { cwd, maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const details = [
            `exit=${error.code ?? 'unknown'}`,
            `signal=${error.signal ?? 'none'}`,
            stderr ? `stderr=${stderr}` : null,
            `stdout=${stdout}`,
          ]
            .filter(Boolean)
            .join(', ');
          if (!expectedError || !expectedError.test(stderr)) {
            console.error(`[git] ${args[0]} failed:`, details);
          }
          reject(new Error(`git ${args[0]} failed: ${details}`));
          return;
        }
        resolve(stdout);
      },
    );
    if (stdinData && child.stdin) {
      child.stdin.write(stdinData);
      child.stdin.end();
    }
  });

export const execShell = (command: string, cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    execCb(
      command,
      { cwd, maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const details = [
            `exit=${error.code ?? 'unknown'}`,
            stderr ? `stderr=${stderr}` : null,
            `stdout=${stdout}`,
          ]
            .filter(Boolean)
            .join(', ');
          console.error(`[git] shell command failed:`, details);
          reject(new Error(`git command failed: ${details}`));
          return;
        }
        resolve(stdout);
      },
    );
  });
