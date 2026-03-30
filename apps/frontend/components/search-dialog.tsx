'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback, useRef } from 'react';
import {
  Modal,
  TextInput,
  SegmentedControl,
  Stack,
  ScrollArea,
  Text,
  Group,
  Box,
  Badge,
  Loader,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconSearch, IconGitCommit } from '@tabler/icons-react';
import type { CommitInfo } from '@/lib/git';
import { searchGit } from '@/lib/api';

type SearchType = 'message' | 'file' | 'hash';

const SearchContent: FunctionComponent<{
  repoPath: string;
}> = ({ repoPath }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('message');
  const [results, setResults] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useDebouncedCallback((q: string, type: SearchType) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    searchGit(repoPath, type, q)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResults([]);
          setLoading(false);
        }
      });
  }, 300);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setLoading(true);
      performSearch(value, searchType);
    },
    [searchType, performSearch],
  );

  const handleTypeChange = useCallback(
    (v: string) => {
      if (v === 'message' || v === 'file' || v === 'hash') {
        setSearchType(v);
        if (query.trim()) {
          setLoading(true);
          performSearch(query, v);
        }
      }
    },
    [query, performSearch],
  );

  return (
    <Stack gap="sm">
      <SegmentedControl
        size="xs"
        value={searchType}
        onChange={handleTypeChange}
        data={[
          { label: 'Commit Message', value: 'message' },
          { label: 'File History', value: 'file' },
          { label: 'Commit Hash', value: 'hash' },
        ]}
      />
      <TextInput
        ref={inputRef}
        autoFocus
        placeholder={
          searchType === 'message'
            ? 'Search commit messages...'
            : searchType === 'file'
              ? 'Enter file path or glob pattern...'
              : 'Enter commit SHA...'
        }
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(e) => handleQueryChange(e.currentTarget.value)}
      />

      {loading && (
        <Group justify="center">
          <Loader size="sm" />
        </Group>
      )}

      <ScrollArea style={{ maxHeight: 400 }}>
        {results.map((commit) => (
          <Box
            key={commit.hash}
            px="sm"
            py={6}
            style={(theme) => ({
              borderBottom: `1px solid ${theme.colors.gray[1]}`,
            })}
          >
            <Group gap="xs" wrap="nowrap">
              <IconGitCommit
                size={14}
                style={{ flexShrink: 0 }}
                color="var(--mantine-color-gray-6)"
              />
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="sm" truncate="end">
                  {commit.message}
                </Text>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {commit.shortHash}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {commit.author}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(commit.date).toLocaleDateString()}
                  </Text>
                </Group>
                {commit.refs.length > 0 && (
                  <Group gap={4} mt={2}>
                    {commit.refs.map((ref) => (
                      <Badge key={ref} size="xs" variant="light">
                        {ref}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            </Group>
          </Box>
        ))}
        {!loading && query && results.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" py="md">
            No results found
          </Text>
        )}
      </ScrollArea>
    </Stack>
  );
};

export const SearchDialog: FunctionComponent<{
  opened: boolean;
  onClose: () => void;
  repoPath: string;
}> = ({ opened, onClose, repoPath }) => {
  return (
    <Modal opened={opened} onClose={onClose} title="Search" size="lg">
      {opened && <SearchContent repoPath={repoPath} />}
    </Modal>
  );
};
