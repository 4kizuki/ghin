---
name: claude-agent-sdk
description: Claude Agent SDK (TypeScript) を使ったコードを書く・レビューする際のベストプラクティスと API リファレンス
user-invocable: true
---

Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) を使った TypeScript / Node.js アプリケーション（Next.js Server Actions, Route Handlers 等）のコードを書く・修正・レビューする際は、以下に従うこと。

## セットアップ

### インストール

```bash
npm install @anthropic-ai/claude-agent-sdk
```

---

## コア API

### `query()` — メイン関数

```ts
import { query } from '@anthropic-ai/claude-agent-sdk';

function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

`Query` は `AsyncGenerator<SDKMessage, void>` を拡張し、以下のメソッドを追加:

```ts
interface Query extends AsyncGenerator<SDKMessage, void> {
  setPermissionMode(mode: PermissionMode): Promise<void>;
  forkSession(options?: { sessionId?: string }): Query;
}
```

#### 基本的な使い方

```ts
for await (const message of query({
  prompt: 'バグを修正してください',
  options: {
    allowedTools: ['Read', 'Edit', 'Glob'],
    permissionMode: 'acceptEdits',
  },
})) {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if ('text' in block) console.log(block.text);
    }
  }
  if (message.type === 'result') {
    console.log(message.result);
  }
}
```

### `tool()` — カスタムツール定義

```ts
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  'tool_name',
  'ツールの説明',
  { param: z.string().describe('パラメータの説明') },
  async ({ param }) => ({
    content: [{ type: 'text', text: `結果: ${param}` }],
  }),
);
```

### `createSdkMcpServer()` — カスタム MCP サーバー

```ts
import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

const server = createSdkMcpServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: [myTool],
});

for await (const message of query({
  prompt: 'タスクを実行',
  options: {
    mcpServers: { 'my-tools': server },
    allowedTools: ['mcp__my-tools__tool_name'],
  },
})) {
  // ...
}
```

---

## V2 プレビュー API

### `unstable_v2_prompt()` — ワンショット

```ts
import { unstable_v2_prompt } from '@anthropic-ai/claude-agent-sdk';

const result = await unstable_v2_prompt('2 + 2 は？', {
  model: 'claude-opus-4-6',
});

if (result.subtype === 'success') {
  console.log(result.result);
}
```

### `unstable_v2_createSession()` — マルチターン

```ts
import { unstable_v2_createSession } from '@anthropic-ai/claude-agent-sdk';

await using session = unstable_v2_createSession({
  model: 'claude-opus-4-6',
});

await session.send('5 + 3 は？');
for await (const msg of session.stream()) {
  if (msg.type === 'assistant') {
    for (const block of msg.message.content) {
      if ('text' in block) console.log(block.text);
    }
  }
}

// コンテキスト保持でターン 2
await session.send('それに 2 を掛けて');
for await (const msg of session.stream()) {
  // ...
}
// await using で自動クローズ
```

### `unstable_v2_resumeSession()` — セッション再開

```ts
import { unstable_v2_resumeSession } from '@anthropic-ai/claude-agent-sdk';

const resumed = unstable_v2_resumeSession(savedSessionId, {
  model: 'claude-opus-4-6',
});

await resumed.send('前回の続き');
for await (const msg of resumed.stream()) {
  // ...
}
resumed.close();
```

---

## 型定義

### Options

```ts
interface Options {
  abortController?: AbortController;
  cwd?: string;
  env?: Record<string, string | undefined>;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'max';
  resume?: string;
  resumeSessionAt?: string;
  forkSession?: boolean;
  permissionMode?: PermissionMode;
  allowDangerouslySkipPermissions?: boolean;
  canUseTool?: CanUseTool;
  allowedTools?: string[];
  disallowedTools?: string[];
  systemPrompt?: string;
  maxTurns?: number;
  mcpServers?: Record<string, MCPServerConfig>;
  agents?: Record<string, AgentDefinition>;
  hooks?: HooksConfig;
}
```

### PermissionMode

```ts
type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'plan';
```

### SDKMessage

```ts
type SDKMessage =
  | SystemMessage
  | AssistantMessage
  | UserMessage
  | ToolResultMessage
  | ResultMessage;

interface ResultMessage {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'user_cancelled';
  result?: string;
  session_id: string;
  uuid: UUID;
}
```

---

## ベストプラクティス

| ユースケース | 推奨モード |
|------------|-----------|
| ユーザー対話あり | `default` + `canUseTool` |
| 開発環境での自動化 | `acceptEdits` |
| CI/CD パイプライン | `bypassPermissions` |
| 計画立案のみ | `plan` |

- **本番環境で `bypassPermissions` を使う場合は `allowedTools` で最小限のツールに制限すること。**

## ビルトインツール一覧

| ツール名 | 用途 |
|---------|------|
| `Read` | ファイル読み込み |
| `Write` | 新規ファイル作成 |
| `Edit` | 既存ファイルの差分編集 |
| `Bash` | シェルコマンド実行 |
| `Glob` | ファイルパターン検索 |
| `Grep` | ファイル内容の正規表現検索 |
| `WebSearch` | Web 検索 |
| `WebFetch` | Web ページ取得・パース |
| `AskUserQuestion` | ユーザーへの質問 |
| `Task` | サブエージェント起動 |
