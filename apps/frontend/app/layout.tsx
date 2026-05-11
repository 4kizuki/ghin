import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { prisma } from '@/lib/prisma';
import {
  OPEN_TAB_IDS_SETTING_KEY,
  parseOpenTabIds,
} from '@/lib/open-tabs-storage';
import { OpenTabStoreInitializer } from '@/components/open-tab-store-initializer';

export const metadata: Metadata = {
  title: { default: 'Ghin', template: '%s | Ghin' },
  description: 'Git Thin Client',
};

const RootLayout: FunctionComponent<{ children: React.ReactNode }> = async ({
  children,
}) => {
  const setting = await prisma.setting.findUnique({
    where: { key: OPEN_TAB_IDS_SETTING_KEY },
  });
  const initialOpenTabIds = parseOpenTabIds(setting?.value ?? null);

  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body style={{ margin: 0 }}>
        <MantineProvider>
          <Notifications position="bottom-right" />
          <ModalsProvider>
            <OpenTabStoreInitializer initial={initialOpenTabIds} />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
};

export default RootLayout;
