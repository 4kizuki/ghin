import {
  IconFile,
  IconFilePlus,
  IconFileOff,
  IconFileDiff,
} from '@tabler/icons-react';
import type { FileChange } from '@/lib/git';
import { NeverError } from '@repo/never-error';

export type FileEntry = {
  path: string;
  status: FileChange['status'];
  staged: boolean;
};

export const getFileIcon = (status: FileChange['status']): typeof IconFile => {
  switch (status) {
    case 'A':
    case '?':
      return IconFilePlus;
    case 'D':
      return IconFileOff;
    case 'M':
    case 'R':
    case 'C':
    case 'U':
      return IconFileDiff;
    case '!':
      return IconFile;
    default:
      throw new NeverError(status);
  }
};

export const getStatusColor = (status: FileChange['status']): string => {
  switch (status) {
    case 'A':
    case '?':
      return 'green';
    case 'D':
      return 'red';
    case 'M':
      return 'yellow';
    case 'R':
      return 'blue';
    case 'C':
      return 'cyan';
    case 'U':
      return 'red';
    case '!':
      return 'gray';
    default:
      throw new NeverError(status);
  }
};
