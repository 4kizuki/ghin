import { execFile } from 'node:child_process';
import { exec, execShell } from './exec';

export const cloneRepository = async (
  url: string,
  destDir: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(
      'git',
      ['clone', url],
      { cwd: destDir, maxBuffer: 50 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        // git clone outputs progress to stderr even on success
        resolve(stderr);
      },
    );
  });

export const openInEditor = (cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile('code', [cwd], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });

export const openInTerminal = (cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile('open', ['-a', 'Terminal', cwd], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });

export const isWorkingTreeClean = async (cwd: string): Promise<boolean> => {
  const output = await exec(['status', '--porcelain'], cwd);
  return output.trim() === '';
};

export const distributeCommitDates = async (
  cwd: string,
  commits: Array<{ hash: string; newDate: string }>,
): Promise<{ output: string; backupTag: string }> => {
  const clean = await isWorkingTreeClean(cwd);
  if (!clean) {
    throw new Error(
      'Working tree is not clean. Please commit or stash changes first.',
    );
  }

  const hashPattern = /^[0-9a-f]{40}$/;
  for (const c of commits) {
    if (!hashPattern.test(c.hash)) {
      throw new Error(`Invalid commit hash: ${c.hash}`);
    }
  }

  const backupTag = `ghin-backup-${Date.now()}`;
  await exec(['tag', backupTag, 'HEAD'], cwd);

  // Find the oldest commit to determine the range
  // Use rev-list to get topological order and find the oldest
  const allHashes = commits.map((c) => c.hash);
  const revListOutput = await exec(
    ['rev-list', '--topo-order', '--reverse', 'HEAD'],
    cwd,
  );
  const revList = revListOutput.trim().split('\n');
  const hashSet = new Set(allHashes);
  const oldestHash = revList.find((h) => hashSet.has(h));

  if (!oldestHash) {
    await exec(['tag', '-d', backupTag], cwd);
    throw new Error('Selected commits are not reachable from HEAD.');
  }

  // Build env-filter case statement
  const cases = commits
    .map(
      (c) =>
        `  ${c.hash})\n    export GIT_AUTHOR_DATE="${c.newDate}"\n    export GIT_COMMITTER_DATE="${c.newDate}"\n    ;;`,
    )
    .join('\n');
  const envFilter = `case "$GIT_COMMIT" in\n${cases}\nesac`;

  // Check if oldest commit is the root
  let range: string;
  try {
    await exec(['rev-parse', `${oldestHash}^`], cwd, {
      expectedError: /unknown revision/,
    });
    range = `${oldestHash}^..HEAD`;
  } catch {
    range = 'HEAD';
  }

  try {
    const output = await execShell(
      `git filter-branch -f --env-filter '${envFilter}' -- ${range}`,
      cwd,
    );

    // Clean up refs/original
    try {
      await execShell(
        'git for-each-ref --format="%(refname)" refs/original/ | while read ref; do git update-ref -d "$ref"; done',
        cwd,
      );
    } catch {
      // refs/original may not exist
    }

    return { output, backupTag };
  } catch (e) {
    // Attempt restore from backup
    try {
      await exec(['reset', '--hard', backupTag], cwd);
    } catch {
      // best effort restore
    }
    throw e;
  }
};
