'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback } from 'react';
import { Stack, TextInput, Button, Alert, Group } from '@mantine/core';
import {
  IconDownload,
  IconArrowLeft,
  IconFolder,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { cloneRepository } from '@/lib/api';
import { useOpenTabActions } from '@/hooks/use-open-tabs';
import { DirectoryPickerModal } from '@/components/directory-picker-modal';

export const CloneRepositoryView: FunctionComponent<{
  defaultDir: string;
}> = ({ defaultDir }) => {
  const router = useRouter();
  const { openTab } = useOpenTabActions();

  const [url, setUrl] = useState('');
  const [destDir, setDestDir] = useState(defaultDir);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirPickerOpened, setDirPickerOpened] = useState(false);

  const handleClone = useCallback(async () => {
    if (!url.trim() || !destDir.trim()) return;
    setCloning(true);
    setError(null);
    try {
      const result = await cloneRepository(url.trim(), destDir.trim());
      openTab(result.repository.id);
      router.push(`/repos/${result.repository.id}/histories`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clone failed');
    } finally {
      setCloning(false);
    }
  }, [url, destDir, openTab, router]);

  const handleDirSelect = useCallback((path: string) => {
    setDestDir(path);
  }, []);

  return (
    <Stack gap="md" style={{ flex: '1 1 0', overflow: 'auto' }}>
      <TextInput
        label="Repository URL (HTTPS)"
        placeholder="https://github.com/user/repo.git"
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)}
        styles={{ input: { fontFamily: 'monospace' } }}
        disabled={cloning}
      />

      <Group gap="xs" align="end">
        <TextInput
          label="Destination Directory"
          placeholder="/path/to/directory"
          value={destDir}
          onChange={(e) => setDestDir(e.currentTarget.value)}
          styles={{ input: { fontFamily: 'monospace' } }}
          style={{ flex: 1 }}
          disabled={cloning}
        />
        <Button
          variant="light"
          leftSection={<IconFolder size={16} />}
          onClick={() => setDirPickerOpened(true)}
          disabled={cloning}
        >
          Browse
        </Button>
      </Group>

      {error !== null && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Group>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={() => void handleClone()}
          loading={cloning}
          disabled={!url.trim() || !destDir.trim()}
        >
          Clone
        </Button>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.back()}
          disabled={cloning}
        >
          Cancel
        </Button>
      </Group>

      <DirectoryPickerModal
        opened={dirPickerOpened}
        onClose={() => setDirPickerOpened(false)}
        onSelect={handleDirSelect}
        initialPath={destDir || '/'}
      />
    </Stack>
  );
};
