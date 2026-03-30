import type { FunctionComponent } from 'react';
import type { Metadata } from 'next';
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import '@mantine/core/styles.css';

export const metadata: Metadata = {
  title: 'Ghin',
  description: 'Ghin Frontend',
};

const RootLayout: FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <MantineProvider forceColorScheme="light">
          <ModalsProvider>{children}</ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
};

export default RootLayout;
