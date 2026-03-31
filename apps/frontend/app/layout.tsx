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
import '@mantine/notifications/styles.css';

export const metadata: Metadata = {
  title: { default: 'Ghin', template: '%s | Ghin' },
  description: 'Git Thin Client',
};

const RootLayout: FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body style={{ margin: 0 }}>
        <MantineProvider>
          <Notifications position="bottom-right" />
          <ModalsProvider>{children}</ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
};

export default RootLayout;
