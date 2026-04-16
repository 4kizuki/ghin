import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { RepoStatus } from '@/lib/git';
import {
  commitChanges,
  setSetting,
  getRemoteUrl,
  addRemote,
  setGitConfig,
  suggestCommitMessage,
  suggestBranchName,
  IdentityUnknownError,
} from '@/lib/api';

export const useCommitFlow = ({
  repoPath,
  status,
  commitMsg,
  setCommitMsg,
  onRefresh,
  defaultAuthorName,
  defaultAuthorEmail,
  initialAutoPush,
}: {
  repoPath: string;
  status: RepoStatus;
  commitMsg: string;
  setCommitMsg: (msg: string) => void;
  onRefresh: () => Promise<void>;
  defaultAuthorName: string;
  defaultAuthorEmail: string;
  initialAutoPush: boolean;
}) => {
  const [newBranchName, setNewBranchName] = useState('');
  const [committing, setCommitting] = useState(false);
  const [autoPush, setAutoPush] = useState(initialAutoPush);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [pushBranchName, setPushBranchName] = useState('');
  const [originUrl, setOriginUrl] = useState('');
  const [originSaving, setOriginSaving] = useState(false);
  const [pendingPushAction, setPendingPushAction] = useState<
    (() => void) | null
  >(null);
  const [identityName, setIdentityName] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');
  const [identitySaving, setIdentitySaving] = useState(false);
  const [pendingCommitAction, setPendingCommitAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [aiCommitLoading, setAiCommitLoading] = useState(false);
  const [aiBranchLoading, setAiBranchLoading] = useState(false);

  const [newBranchOpened, { open: openNewBranch, close: closeNewBranch }] =
    useDisclosure(false);
  const [
    pushConfirmOpened,
    { open: openPushConfirm, close: closePushConfirm },
  ] = useDisclosure(false);
  const [
    originSetupOpened,
    { open: openOriginSetup, close: closeOriginSetup },
  ] = useDisclosure(false);
  const [identityOpened, { open: openIdentity, close: closeIdentity }] =
    useDisclosure(false);

  const fetchRemoteUrlInfo = useCallback(async (): Promise<boolean> => {
    try {
      const result = await getRemoteUrl(repoPath, 'origin');
      setRemoteUrl(result.url);
      return true;
    } catch {
      setRemoteUrl(null);
      return false;
    }
  }, [repoPath]);

  const handleIdentityError = useCallback(
    (error: unknown, retryAction: () => Promise<void>) => {
      if (error instanceof IdentityUnknownError) {
        setIdentityName(error.userName ?? defaultAuthorName);
        setIdentityEmail(error.userEmail ?? defaultAuthorEmail);
        setPendingCommitAction(() => retryAction);
        openIdentity();
        return true;
      }
      return false;
    },
    [openIdentity, defaultAuthorName, defaultAuthorEmail],
  );

  const handleCommitDirect = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    try {
      await commitChanges(repoPath, commitMsg.trim(), undefined, false);
      setCommitMsg('');
      await onRefresh();
    } catch (error) {
      handleIdentityError(error, async () => {
        await commitChanges(repoPath, commitMsg.trim(), undefined, false);
        setCommitMsg('');
        await onRefresh();
      });
    } finally {
      setCommitting(false);
    }
  }, [repoPath, commitMsg, onRefresh, handleIdentityError, setCommitMsg]);

  const handleCommitAndPush = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    const effectivePushBranch =
      !status.upstream && pushBranchName ? pushBranchName : undefined;
    try {
      await commitChanges(
        repoPath,
        commitMsg.trim(),
        undefined,
        true,
        effectivePushBranch,
      );
      setCommitMsg('');
      closePushConfirm();
      await onRefresh();
    } catch (error) {
      handleIdentityError(error, async () => {
        const branch =
          !status.upstream && pushBranchName ? pushBranchName : undefined;
        await commitChanges(
          repoPath,
          commitMsg.trim(),
          undefined,
          true,
          branch,
        );
        setCommitMsg('');
        closePushConfirm();
        await onRefresh();
      });
    } finally {
      setCommitting(false);
    }
  }, [
    repoPath,
    commitMsg,
    status.upstream,
    pushBranchName,
    onRefresh,
    closePushConfirm,
    handleIdentityError,
    setCommitMsg,
  ]);

  const showOriginSetup = useCallback(
    (onComplete: () => void) => {
      setOriginUrl('');
      setPendingPushAction(() => onComplete);
      openOriginSetup();
    },
    [openOriginSetup],
  );

  const handleAddOrigin = useCallback(async () => {
    if (!originUrl.trim()) return;
    setOriginSaving(true);
    try {
      await addRemote(repoPath, 'origin', originUrl.trim());
      setRemoteUrl(originUrl.trim());
      closeOriginSetup();
      pendingPushAction?.();
    } catch {
      notifications.show({
        title: 'origin の追加に失敗しました',
        message:
          'URL を確認してください。すでに origin が存在する可能性があります。',
        color: 'red',
        style: { marginBottom: 80 },
      });
    } finally {
      setOriginSaving(false);
    }
  }, [repoPath, originUrl, closeOriginSetup, pendingPushAction]);

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    if (autoPush) {
      setPushBranchName('');
      const ok = await fetchRemoteUrlInfo();
      if (!ok) {
        showOriginSetup(() => openPushConfirm());
        return;
      }
      openPushConfirm();
    } else {
      handleCommitDirect();
    }
  }, [
    commitMsg,
    autoPush,
    fetchRemoteUrlInfo,
    showOriginSetup,
    openPushConfirm,
    handleCommitDirect,
  ]);

  const handleOpenNewBranch = useCallback(async () => {
    setPushBranchName('');
    if (autoPush) {
      const ok = await fetchRemoteUrlInfo();
      if (!ok) {
        showOriginSetup(() => openNewBranch());
        return;
      }
    }
    openNewBranch();
  }, [autoPush, fetchRemoteUrlInfo, showOriginSetup, openNewBranch]);

  const handleCommitToNewBranch = useCallback(async () => {
    if (!commitMsg.trim() || !newBranchName.trim()) return;
    setCommitting(true);
    const effectivePushBranch =
      autoPush && pushBranchName ? pushBranchName : undefined;
    try {
      await commitChanges(
        repoPath,
        commitMsg.trim(),
        newBranchName.trim(),
        autoPush,
        effectivePushBranch,
      );
      setCommitMsg('');
      setNewBranchName('');
      setPushBranchName('');
      closeNewBranch();
      await onRefresh();
    } catch (error) {
      handleIdentityError(error, async () => {
        const branch = autoPush && pushBranchName ? pushBranchName : undefined;
        await commitChanges(
          repoPath,
          commitMsg.trim(),
          newBranchName.trim(),
          autoPush,
          branch,
        );
        setCommitMsg('');
        setNewBranchName('');
        setPushBranchName('');
        closeNewBranch();
        await onRefresh();
      });
    } finally {
      setCommitting(false);
    }
  }, [
    repoPath,
    commitMsg,
    newBranchName,
    autoPush,
    pushBranchName,
    onRefresh,
    closeNewBranch,
    handleIdentityError,
    setCommitMsg,
  ]);

  const handleSaveIdentity = useCallback(async () => {
    if (!identityName.trim() || !identityEmail.trim()) return;
    setIdentitySaving(true);
    try {
      await setGitConfig(repoPath, 'user.name', identityName.trim());
      await setGitConfig(repoPath, 'user.email', identityEmail.trim());
      closeIdentity();
      if (pendingCommitAction) {
        await pendingCommitAction();
        setPendingCommitAction(null);
      }
    } catch {
      notifications.show({
        title: 'Git config の設定に失敗しました',
        message: 'user.name / user.email を設定できませんでした。',
        color: 'red',
        style: { marginBottom: 80 },
      });
    } finally {
      setIdentitySaving(false);
    }
  }, [
    repoPath,
    identityName,
    identityEmail,
    closeIdentity,
    pendingCommitAction,
  ]);

  const handleAutoPushToggle = useCallback((checked: boolean) => {
    setAutoPush(checked);
    setSetting('autoPush', String(checked));
  }, []);

  const handleSuggestCommitMessage = useCallback(async () => {
    if (status.stagedFiles.length === 0) return;
    setAiCommitLoading(true);
    try {
      const suggestion = await suggestCommitMessage(
        repoPath,
        status.branch,
        status.stagedFiles.map((f) => ({
          path: f.path,
          status: f.status,
          staged: f.staged,
        })),
      );
      const message = suggestion.body
        ? `${suggestion.subject}\n\n${suggestion.body}`
        : suggestion.subject;
      setCommitMsg(message);
    } catch {
      notifications.show({
        title: 'AI Suggestion Failed',
        message: 'Could not generate a commit message.',
        color: 'red',
      });
    } finally {
      setAiCommitLoading(false);
    }
  }, [repoPath, status.branch, status.stagedFiles, setCommitMsg]);

  const handleSuggestBranchName = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setAiBranchLoading(true);
    try {
      const suggestion = await suggestBranchName({
        commitMessage: commitMsg.trim(),
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
  }, [commitMsg]);

  const handleCloseIdentity = useCallback(() => {
    closeIdentity();
    setPendingCommitAction(null);
  }, [closeIdentity]);

  return {
    newBranchName,
    setNewBranchName,
    committing,
    autoPush,
    remoteUrl,
    pushBranchName,
    setPushBranchName,
    originUrl,
    setOriginUrl,
    originSaving,
    identityName,
    setIdentityName,
    identityEmail,
    setIdentityEmail,
    identitySaving,
    aiCommitLoading,
    aiBranchLoading,
    newBranchOpened,
    closeNewBranch,
    pushConfirmOpened,
    closePushConfirm,
    originSetupOpened,
    closeOriginSetup,
    identityOpened,
    handleCloseIdentity,
    handleCommit,
    handleCommitAndPush,
    handleCommitToNewBranch,
    handleOpenNewBranch,
    handleAddOrigin,
    handleSaveIdentity,
    handleAutoPushToggle,
    handleSuggestCommitMessage,
    handleSuggestBranchName,
  };
};
