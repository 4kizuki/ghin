'use client';

import type { FunctionComponent } from 'react';
import { useState, useCallback } from 'react';
import {
  Stack,
  Switch,
  Select,
  TextInput,
  Text,
  Anchor,
  Group,
} from '@mantine/core';
import { setSetting } from '@/lib/api';

const MODEL_PRESETS = [
  { value: 'gpt-5.3-codex-spark', label: 'gpt-5.3-codex-spark' },
  { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
  { value: '__custom__', label: 'Custom' },
];

const PROVIDER_OPTIONS = [{ value: 'codex', label: 'Codex' }];

const isPresetModel = (model: string): boolean =>
  MODEL_PRESETS.some((p) => p.value === model && p.value !== '__custom__');

export const SettingsView: FunctionComponent<{
  initialAiEnabled: boolean;
  initialAiProvider: string;
  initialAiModel: string;
}> = ({ initialAiEnabled, initialAiProvider, initialAiModel }) => {
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [aiProvider, setAiProvider] = useState(initialAiProvider);
  const [selectValue, setSelectValue] = useState(
    isPresetModel(initialAiModel) ? initialAiModel : '__custom__',
  );
  const [customModel, setCustomModel] = useState(
    isPresetModel(initialAiModel) ? '' : initialAiModel,
  );

  const handleAiEnabledChange = useCallback((checked: boolean) => {
    setAiEnabled(checked);
    setSetting('aiEnabled', String(checked));
  }, []);

  const handleProviderChange = useCallback((value: string | null) => {
    if (!value) return;
    setAiProvider(value);
    setSetting('aiProvider', value);
  }, []);

  const handleModelSelectChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      setSelectValue(value);
      if (value !== '__custom__') {
        setCustomModel('');
        setSetting('aiModel', value);
      } else if (customModel) {
        setSetting('aiModel', customModel);
      }
    },
    [customModel],
  );

  const handleCustomModelChange = useCallback((value: string) => {
    setCustomModel(value);
    if (value) {
      setSetting('aiModel', value);
    }
  }, []);

  return (
    <Stack gap="lg">
      <Text fw={600} size="lg">
        AI Suggestion
      </Text>

      <Switch
        label="Enable AI suggestions"
        checked={aiEnabled}
        onChange={(e) => handleAiEnabledChange(e.currentTarget.checked)}
      />

      <Select
        label="Provider"
        data={PROVIDER_OPTIONS}
        value={aiProvider}
        onChange={handleProviderChange}
        disabled={!aiEnabled}
      />

      <Stack gap="xs">
        <Select
          label="Model"
          data={MODEL_PRESETS}
          value={selectValue}
          onChange={handleModelSelectChange}
          disabled={!aiEnabled}
        />

        {selectValue === '__custom__' && (
          <TextInput
            placeholder="Enter model name"
            value={customModel}
            onChange={(e) => handleCustomModelChange(e.currentTarget.value)}
            disabled={!aiEnabled}
          />
        )}

        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Available models:
          </Text>
          <Anchor
            size="xs"
            href="https://developers.openai.com/codex/models"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://developers.openai.com/codex/models
          </Anchor>
        </Group>
      </Stack>
    </Stack>
  );
};
