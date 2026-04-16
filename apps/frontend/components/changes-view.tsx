'use client';

import type { FunctionComponent } from 'react';
import { useMemo, useRef } from 'react';
import { Box, Group, Text, Loader, Notification } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { RepoStatus } from '@/lib/git';
import { useDiffFontSize } from '@/hooks/use-diff-font-size';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut';
import { useFileSelection } from '@/hooks/use-file-selection';
import { useFileOperations } from '@/hooks/use-file-operations';
import { useCommitFlow } from '@/hooks/use-commit-flow';
import { DiffViewer } from '@/components/diff-viewer';
import { BranchSwitcher } from '@/components/branch-switcher';
import { StatusBar } from '@/components/changes-view/status-bar';
import { FileListPane } from '@/components/changes-view/file-list-pane';
import { CommitPanel } from '@/components/changes-view/commit-panel';
import { NewBranchModal } from '@/components/changes-view/new-branch-modal';
import { PushConfirmModal } from '@/components/changes-view/push-confirm-modal';
import { OriginSetupModal } from '@/components/changes-view/origin-setup-modal';
import { IdentityModal } from '@/components/changes-view/identity-modal';
import { DiscardConfirmModal } from '@/components/changes-view/discard-confirm-modal';

export const ChangesView: FunctionComponent<{
  repoPath: string;
  status: RepoStatus;
  onRefresh: () => Promise<void>;
  initialAutoPush: boolean;
  aiEnabled: boolean;
  defaultAuthorName: string;
  defaultAuthorEmail: string;
}> = ({
  repoPath,
  status,
  onRefresh,
  initialAutoPush,
  aiEnabled,
  defaultAuthorName,
  defaultAuthorEmail,
}) => {
  const router = useRouter();
  const params = useParams<{ repoId: string }>();
  const [diffFontSize, setDiffFontSize] = useDiffFontSize();
  const commitInputRef = useRef<HTMLTextAreaElement>(null);
  const [notification, setNotification] = useState<{
    message: string;
    color: string;
  } | null>(null);
  const [branchOpened, { open: openBranch, close: closeBranch }] =
    useDisclosure(false);

  const totalChanges =
    status.stagedFiles.length +
    status.unstagedFiles.length +
    status.untrackedFiles.length;

  // ─── Custom Hooks ───
  const fileSelection = useFileSelection({ repoPath, status });

  const fileOps = useFileOperations({
    repoPath,
    onRefresh,
    selectedFile: fileSelection.selectedFile,
    selectedFileStaged: fileSelection.selectedFileStaged,
    loadDiff: fileSelection.loadDiff,
    clearSelection: fileSelection.clearSelection,
    stagedEntries: fileSelection.stagedEntries,
    unstagedEntries: fileSelection.unstagedEntries,
  });

  const commitFlow = useCommitFlow({
    repoPath,
    status,
    commitMsg: fileSelection.commitMsg,
    setCommitMsg: fileSelection.setCommitMsg,
    onRefresh,
    defaultAuthorName,
    defaultAuthorEmail,
    initialAutoPush,
  });

  // ─── Keyboard shortcuts ───
  const shortcuts = useMemo(
    () => [
      {
        key: 'j',
        handler: () =>
          fileSelection.setFocusedIndex((prev: number) => {
            const next = Math.min(
              prev + 1,
              fileSelection.allEntries.length - 1,
            );
            const file = fileSelection.allEntries[next];
            if (file) {
              fileSelection.setSelectedFile(file.path);
              fileSelection.setSelectedFileStaged(file.staged);
              fileSelection.loadDiff(file.path, file.staged);
            }
            return next;
          }),
      },
      {
        key: 'k',
        handler: () =>
          fileSelection.setFocusedIndex((prev: number) => {
            const next = Math.max(prev - 1, 0);
            const file = fileSelection.allEntries[next];
            if (file) {
              fileSelection.setSelectedFile(file.path);
              fileSelection.setSelectedFileStaged(file.staged);
              fileSelection.loadDiff(file.path, file.staged);
            }
            return next;
          }),
      },
      {
        key: ' ',
        handler: () => {
          const file = fileSelection.allEntries[fileSelection.focusedIndex];
          if (file) fileOps.handleFileToggle(file);
        },
      },
      {
        key: 'Enter',
        meta: true,
        handler: commitFlow.handleCommit,
      },
      { key: 'b', meta: true, handler: openBranch },
    ],
    [fileSelection, fileOps, commitFlow, openBranch],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <StatusBar
        branch={status.branch}
        ahead={status.ahead}
        behind={status.behind}
        aheadOfMain={status.aheadOfMain}
        behindMain={status.behindMain}
        totalChanges={totalChanges}
        hasConflicts={status.hasConflicts}
        diffFontSize={diffFontSize}
        onDiffFontSizeChange={setDiffFontSize}
        onNavigateHistory={() =>
          router.push(`/repos/${params.repoId}/histories`)
        }
      />

      {notification && (
        <Notification
          color={notification.color}
          onClose={() => setNotification(null)}
          withCloseButton
          mx="md"
          mt="xs"
        >
          {notification.message}
        </Notification>
      )}

      <Box
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <FileListPane
          stagedEntries={fileSelection.stagedEntries}
          unstagedEntries={fileSelection.unstagedEntries}
          focusedIndex={fileSelection.focusedIndex}
          selectedFile={fileSelection.selectedFile}
          selectedFileStaged={fileSelection.selectedFileStaged}
          hasTrackedUnstaged={status.unstagedFiles.length > 0}
          onFileClick={fileSelection.handleFileClick}
          onFileToggle={fileOps.handleFileToggle}
          onDiscardFile={fileOps.handleDiscardFile}
          onStageAll={fileOps.handleStageAll}
          onUnstageAll={fileOps.handleUnstageAll}
          onDiscardAll={fileOps.handleDiscardAll}
        />

        {/* Right pane: diff viewer */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {fileSelection.loadingDiff ? (
            <Group justify="center" pt="xl">
              <Loader size="sm" />
            </Group>
          ) : fileSelection.selectedFile && fileSelection.diff.length > 0 ? (
            <DiffViewer
              files={fileSelection.diff}
              staged={fileSelection.selectedFileStaged}
              diffFontSize={diffFontSize}
              onStageHunk={fileOps.handleHunkStage}
              onUnstageHunk={fileOps.handleHunkUnstage}
              onDiscardHunk={
                fileSelection.selectedFileStaged
                  ? undefined
                  : fileOps.handleDiscardHunk
              }
            />
          ) : fileSelection.selectedFile ? (
            <Group justify="center" pt="xl">
              <Text c="dimmed" size="sm">
                No diff available
              </Text>
            </Group>
          ) : (
            <Group justify="center" pt="xl">
              <Text c="dimmed" size="sm">
                Select a file to view changes
              </Text>
            </Group>
          )}
        </Box>
      </Box>

      <CommitPanel
        branch={status.branch}
        commitMsg={fileSelection.commitMsg}
        onCommitMsgChange={fileSelection.setCommitMsg}
        commitInputRef={commitInputRef}
        aiEnabled={aiEnabled}
        aiCommitLoading={commitFlow.aiCommitLoading}
        onSuggestCommitMessage={commitFlow.handleSuggestCommitMessage}
        stagedCount={status.stagedFiles.length}
        autoPush={commitFlow.autoPush}
        onAutoPushToggle={commitFlow.handleAutoPushToggle}
        onCommit={commitFlow.handleCommit}
        onOpenNewBranch={commitFlow.handleOpenNewBranch}
        committing={commitFlow.committing}
      />

      <BranchSwitcher
        opened={branchOpened}
        onClose={closeBranch}
        repoPath={repoPath}
        onSwitch={onRefresh}
      />

      <NewBranchModal
        opened={commitFlow.newBranchOpened}
        onClose={commitFlow.closeNewBranch}
        newBranchName={commitFlow.newBranchName}
        onNewBranchNameChange={commitFlow.setNewBranchName}
        autoPush={commitFlow.autoPush}
        remoteUrl={commitFlow.remoteUrl}
        pushBranchName={commitFlow.pushBranchName}
        onPushBranchNameChange={commitFlow.setPushBranchName}
        commitMsg={fileSelection.commitMsg}
        aiEnabled={aiEnabled}
        aiBranchLoading={commitFlow.aiBranchLoading}
        onSuggestBranchName={commitFlow.handleSuggestBranchName}
        onCommit={commitFlow.handleCommitToNewBranch}
        committing={commitFlow.committing}
      />

      <PushConfirmModal
        opened={commitFlow.pushConfirmOpened}
        onClose={commitFlow.closePushConfirm}
        remoteUrl={commitFlow.remoteUrl}
        upstream={status.upstream}
        branch={status.branch}
        pushBranchName={commitFlow.pushBranchName}
        onPushBranchNameChange={commitFlow.setPushBranchName}
        onConfirm={commitFlow.handleCommitAndPush}
        committing={commitFlow.committing}
      />

      <OriginSetupModal
        opened={commitFlow.originSetupOpened}
        onClose={commitFlow.closeOriginSetup}
        originUrl={commitFlow.originUrl}
        onOriginUrlChange={commitFlow.setOriginUrl}
        onSubmit={commitFlow.handleAddOrigin}
        saving={commitFlow.originSaving}
      />

      <IdentityModal
        opened={commitFlow.identityOpened}
        onClose={commitFlow.handleCloseIdentity}
        identityName={commitFlow.identityName}
        onIdentityNameChange={commitFlow.setIdentityName}
        identityEmail={commitFlow.identityEmail}
        onIdentityEmailChange={commitFlow.setIdentityEmail}
        onSave={commitFlow.handleSaveIdentity}
        saving={commitFlow.identitySaving}
      />

      <DiscardConfirmModal
        discard={fileOps.discardConfirm}
        onClose={() => fileOps.setDiscardConfirm(null)}
      />
    </Box>
  );
};
