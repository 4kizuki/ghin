import type { FileChange, Hunk, FileDiff, CommitInfo } from './types';

/**
 * Git の C スタイルクオートされたパスをデコードする。
 * `core.quotePath=true` 時に非 ASCII 文字が `"\343\201\202"` のように
 * 8進エスケープされるのを UTF-8 に復元する。
 * クオートされていないパスはそのまま返す。
 */
export const unquoteGitPath = (raw: string): string => {
  if (!raw.startsWith('"') || !raw.endsWith('"')) return raw;

  const inner = raw.slice(1, -1);
  const bytes: number[] = [];
  let i = 0;

  while (i < inner.length) {
    if (inner[i] === '\\' && i + 1 < inner.length) {
      const next = inner[i + 1];

      // 8進エスケープ: \NNN (3桁)
      if (next >= '0' && next <= '3' && i + 3 < inner.length) {
        const octal = inner.slice(i + 1, i + 4);
        if (/^[0-3][0-7]{2}$/.test(octal)) {
          bytes.push(parseInt(octal, 8));
          i += 4;
          continue;
        }
      }

      // C スタイルエスケープ
      const escapeMap: Record<string, number> = {
        '\\': 0x5c,
        '"': 0x22,
        n: 0x0a,
        t: 0x09,
        a: 0x07,
        b: 0x08,
        f: 0x0c,
        r: 0x0d,
        v: 0x0b,
      };
      const mapped = escapeMap[next];
      if (mapped !== undefined) {
        bytes.push(mapped);
        i += 2;
        continue;
      }
    }

    bytes.push(inner.charCodeAt(i));
    i++;
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
};

export const parseStatusLine = (
  line: string,
): { staged: FileChange | null; unstaged: FileChange | null } | null => {
  if (line.length < 4) return null;
  const x = line[0];
  const y = line[1];
  const filePath = unquoteGitPath(line.slice(3));

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
    const quotedMatch = headerLine.match(/^"a\/(.*)" "b\/(.*)"$/);
    const unquotedMatch = headerLine.match(/^a\/(.*) b\/(.*)$/);
    const pathMatch = quotedMatch ?? unquotedMatch;
    if (!pathMatch) continue;

    const oldPath = quotedMatch
      ? unquoteGitPath(`"${pathMatch[1]}"`)
      : pathMatch[1];
    const newPath = quotedMatch
      ? unquoteGitPath(`"${pathMatch[2]}"`)
      : pathMatch[2];
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
