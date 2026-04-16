import type { FileChange, Hunk, FileDiff, CommitInfo } from './types';

export const parseStatusLine = (
  line: string,
): { staged: FileChange | null; unstaged: FileChange | null } | null => {
  if (line.length < 4) return null;
  const x = line[0];
  const y = line[1];
  const filePath = line.slice(3);

  let staged: FileChange | null = null;
  let unstaged: FileChange | null = null;

  if (x === '?' && y === '?') {
    return {
      staged: null,
      unstaged: { path: filePath, status: '?', staged: false },
    };
  }

  if (x !== ' ' && x !== '?') {
    staged = {
      path: filePath,
      status:
        x === 'M' ||
        x === 'A' ||
        x === 'D' ||
        x === 'R' ||
        x === 'C' ||
        x === 'U'
          ? x
          : 'M',
      staged: true,
    };
  }

  if (y !== ' ' && y !== '?') {
    unstaged = {
      path: filePath,
      status:
        y === 'M' ||
        y === 'A' ||
        y === 'D' ||
        y === 'R' ||
        y === 'C' ||
        y === 'U'
          ? y
          : 'M',
      staged: false,
    };
  }

  return { staged, unstaged };
};

export const parseHunkHeader = (
  header: string,
): {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
} => {
  const match = header.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!match) return { oldStart: 0, oldCount: 0, newStart: 0, newCount: 0 };
  return {
    oldStart: parseInt(match[1], 10),
    oldCount: match[2] !== undefined ? parseInt(match[2], 10) : 1,
    newStart: parseInt(match[3], 10),
    newCount: match[4] !== undefined ? parseInt(match[4], 10) : 1,
  };
};

export const parseDiff = (diffOutput: string): FileDiff[] => {
  const files: FileDiff[] = [];
  const fileSections = diffOutput.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split('\n');
    const headerLine = lines[0];
    const pathMatch = headerLine.match(/a\/(.*) b\/(.*)/);
    if (!pathMatch) continue;

    const oldPath = pathMatch[1];
    const newPath = pathMatch[2];
    const isNew = section.includes('new file mode');
    const isDeleted = section.includes('deleted file mode');
    const isBinary = section.includes('Binary files');

    const hunks: Hunk[] = [];
    let currentHunk: Hunk | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const { oldStart, oldCount, newStart, newCount } =
          parseHunkHeader(line);
        currentHunk = {
          header: line,
          oldStart,
          oldCount,
          newStart,
          newCount,
          lines: [],
        };
        hunks.push(currentHunk);
        oldLine = oldStart;
        newLine = newStart;
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          oldLineNumber: null,
          newLineNumber: newLine,
        });
        newLine++;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'remove',
          content: line.slice(1),
          oldLineNumber: oldLine,
          newLineNumber: null,
        });
        oldLine++;
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine,
          newLineNumber: newLine,
        });
        oldLine++;
        newLine++;
      }
    }

    files.push({
      path: newPath,
      oldPath: oldPath !== newPath ? oldPath : undefined,
      hunks,
      isBinary,
      isNew,
      isDeleted,
    });
  }

  return files;
};

export const parseLogLine = (line: string): CommitInfo | null => {
  // Format: hash|shortHash|author|email|date|parents|refs|message
  const parts = line.split('|');
  if (parts.length < 8) return null;
  return {
    hash: parts[0],
    shortHash: parts[1],
    author: parts[2],
    authorEmail: parts[3],
    date: parts[4],
    parents: parts[5] ? parts[5].split(' ') : [],
    refs: parts[6] ? parts[6].split(', ').filter(Boolean) : [],
    message: parts.slice(7).join('|'),
  };
};
