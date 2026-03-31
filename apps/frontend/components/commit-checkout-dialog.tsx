'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  TextInput,
  Stack,
  Text,
  Group,
  Box,
  Loader,
  Button,
  Badge,
} from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';
import {
  getBranchesContaining,
  checkoutRef,
  createBranch,
  suggestBranchName,
} from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { AiSuggestButton } from '@/components/ai-suggest-button';

type DialogStatus = 'idle' | 'loading' | 'select' | 'create';

const isRemoteBranch = (branch: string): boolean =>
  branch.startsWith('origin/');

const remoteToLocalName = (branch: string): string =>
  branch.replace(/^origin\//, '');

const deduplicateBranches = (branches: string[]): string[] => {
  const localBranches = new Set(
    branches.filter((b) => !b.startsWith('origin/')),
  );
  return branches.filter((b) => {
    if (!b.startsWith('origin/')) return true;
    const localName = b.replace(/^origin\//, '');
    return !localBranches.has(localName);
  });
};

export const CommitCheckoutDialog: FunctionComponent<{
  commitHash: string | null;
  commitMessage: string | null;
  hasBranchRef: boolean;
  repoPath: string;
  currentBranch: string | undefined;
  onClose: () => void;
  onCheckout: () => Promise<void>;
}> = ({
  commitHash,
  commitMessage,
  hasBranchRef,
  repoPath,
  currentBranch,
  onClose,
  onCheckout,
}) => {
  const [status, setStatus] = useState<DialogStatus>('idle');
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [createFromRemote, setCreateFromRemote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [aiBranchLoading, setAiBranchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!commitHash) {
      setStatus('idle');
      setBranches([]);
      setNewBranchName('');
      setCreateFromRemote(null);
      setError(null);
      setCheckoutLoading(false);
      hashRef.current = null;
      return;
    }

    hashRef.current = commitHash;
    setError(null);

    if (!hasBranchRef) {
      setStatus('create');
      return;
    }

    setStatus('loading');

    getBranchesContaining(repoPath, commitHash)
      .then(async (result) => {
        if (hashRef.current !== commitHash) return;

        const deduplicated = deduplicateBranches(result.branches);

        if (deduplicated.length === 1) {
          const branch = deduplicated[0];
          if (branch === currentBranch) {
            onClose();
            return;
          }
          if (isRemoteBranch(branch)) {
            setNewBranchName(remoteToLocalName(branch));
            setCreateFromRemote(branch);
            setStatus('create');
          } else {
            setCheckoutLoading(true);
            try {
              await checkoutRef(repoPath, branch);
              await onCheckout();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Checkout failed');
              setStatus('select');
              setBranches(deduplicated);
              return;
            }
            onClose();
          }
        } else if (deduplicated.length > 1) {
          setBranches(deduplicated);
          setStatus('select');
        } else {
          setStatus('create');
        }
      })
      .catch((e) => {
        if (hashRef.current !== commitHash) return;
        setError(e instanceof Error ? e.message : 'Failed to load branches');
        setStatus('create');
      });
  }, [commitHash, hasBranchRef, repoPath, currentBranch, onClose, onCheckout]);

  const handleSuggestBranchName = useCallback(async () => {
    if (!commitHash) return;
    setAiBranchLoading(true);
    try {
      const suggestion = await suggestBranchName({
        commitMessage: commitMessage ?? '',
        commitHash,
      });
      setNewBranchName(suggestion.branchName);
    } catch {
      notifications.show({
        title: 'AI Suggestion Failed',
        message: 'Could not generate a branch name.',
        color: 'red',
      });
    } finally {
      setAiBranchLoading(false);
    }
  }, [commitHash, commitMessage]);

  const handleCheckoutBranch = useCallback(
    async (branch: string) => {
      if (branch === currentBranch) {
        onClose();
        return;
      }
      if (isRemoteBranch(branch)) {
        setNewBranchName(remoteToLocalName(branch));
        setCreateFromRemote(branch);
        setStatus('create');
        return;
      }
      setError(null);
      setCheckoutLoading(true);
      try {
        await checkoutRef(repoPath, branch);
        await onCheckout();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
      } finally {
        setCheckoutLoading(false);
      }
    },
    [repoPath, currentBranch, onClose, onCheckout],
  );

  const handleCreateBranch = useCallback(async () => {
    if (!newBranchName.trim() || !commitHash) return;
    setError(null);
    setCheckoutLoading(true);
    try {
      const startPoint = createFromRemote ?? commitHash;
      await createBranch(repoPath, newBranchName.trim(), startPoint);
      await onCheckout();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create branch');
    } finally {
      setCheckoutLoading(false);
    }
  }, [
    repoPath,
    newBranchName,
    commitHash,
    createFromRemote,
    onClose,
    onCheckout,
  ]);

  const modalOpened = status === 'select' || status === 'create';

  return (
    <>
      {status === 'loading' && commitHash && (
        <Box
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="xs" c="dimmed">
              Loading branches...
            </Text>
          </Group>
        </Box>
      )}

      <Modal
        opened={modalOpened}
        onClose={onClose}
        title={
          status === 'select'
            ? 'Select Branch to Checkout'
            : createFromRemote
              ? 'Create Local Branch'
              : 'Create Branch'
        }
        size="sm"
      >
        {error && (
          <Text size="sm" c="red" mb="sm">
            {error}
          </Text>
        )}

        {status === 'select' && (
          <Stack gap={0}>
            {branches.map((branch) => (
              <Box
                key={branch}
                px="sm"
                py={6}
                style={(theme) => ({
                  cursor: branch === currentBranch ? 'default' : 'pointer',
                  backgroundColor:
                    branch === currentBranch ? theme.colors.blue[0] : undefined,
                  borderRadius: theme.radius.sm,
                })}
                onClick={() => {
                  if (!checkoutLoading) handleCheckoutBranch(branch);
                }}
              >
                <Group gap="xs" wrap="nowrap">
                  <IconGitBranch size={14} />
                  <Text
                    size="sm"
                    c={isRemoteBranch(branch) ? 'dimmed' : undefined}
                  >
                    {branch}
                  </Text>
                  {branch === currentBranch && (
                    <Badge size="xs" color="blue">
                      current
                    </Badge>
                  )}
                  {isRemoteBranch(branch) && (
                    <Badge size="xs" color="gray" variant="light">
                      create local
                    </Badge>
                  )}
                </Group>
              </Box>
            ))}
            {checkoutLoading && (
              <Group justify="center" py="xs">
                <Loader size="xs" />
              </Group>
            )}
          </Stack>
        )}

        {status === 'create' && (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {createFromRemote
                ? `Create a local branch from ${createFromRemote}.`
                : 'No branch points to this commit. Create a new branch.'}
            </Text>
            <TextInput
              ref={inputRef}
              autoFocus
              placeholder="new-branch-name"
              leftSection={<IconGitBranch size={16} />}
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBranch();
              }}
              rightSection={
                <AiSuggestButton
                  onClick={handleSuggestBranchName}
                  loading={aiBranchLoading}
                  tooltip="AI: suggest branch name"
                />
              }
              rightSectionWidth={32}
            />
            <Button
              onClick={handleCreateBranch}
              loading={checkoutLoading}
              disabled={!newBranchName.trim()}
            >
              Create & Checkout
            </Button>
            {createFromRemote && branches.length > 0 && (
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setCreateFromRemote(null);
                  setNewBranchName('');
                  setStatus('select');
                }}
              >
                Back to branch list
              </Button>
            )}
          </Stack>
        )}
      </Modal>
    </>
  );
};
