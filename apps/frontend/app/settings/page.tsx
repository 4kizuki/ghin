import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import { Container, Title, Group } from '@mantine/core';
import { prisma } from '@/lib/prisma';
import { SettingsView } from '@/components/settings-view';
import { BackLink } from './back-link';

export const metadata: Metadata = { title: 'Settings' };

const DEFAULT_MODEL = 'gpt-5.3-codex-spark';
const DEFAULT_PROVIDER = 'codex';

const SettingsPage: FunctionComponent = async () => {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'aiEnabled',
          'aiProvider',
          'aiModel',
          'defaultAuthorName',
          'defaultAuthorEmail',
          'defaultCloneDir',
          'dateDisplayFormat',
        ],
      },
    },
  });
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <Container size="sm" py="xl">
      <Group gap="sm" mb="lg">
        <BackLink />
        <Title order={2}>Settings</Title>
      </Group>
      <SettingsView
        initialAiEnabled={settings['aiEnabled'] === 'true'}
        initialAiProvider={settings['aiProvider'] ?? DEFAULT_PROVIDER}
        initialAiModel={settings['aiModel'] ?? DEFAULT_MODEL}
        initialDefaultAuthorName={settings['defaultAuthorName'] ?? ''}
        initialDefaultAuthorEmail={settings['defaultAuthorEmail'] ?? ''}
        initialDefaultCloneDir={settings['defaultCloneDir'] ?? ''}
        initialDateDisplayFormat={settings['dateDisplayFormat'] ?? 'relative'}
      />
    </Container>
  );
};

export default SettingsPage;
