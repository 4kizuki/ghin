import 'server-only';

import { Codex } from '@openai/codex-sdk';
import { z } from 'zod';

import type { FileDiff } from '@/lib/git';

// ─── Phase Classification ───────────────────────────────────────────

type CommitPhase =
  | 'analyzing-diff'
  | 'checking-history'
  | 'inspecting-file'
  | 'working';

const classifyCommand = (command: string): CommitPhase => {
  const c = command.toLowerCase();
  if (c.includes('diff')) return 'analyzing-diff';
  if (c.includes('log') || c.includes('show')) return 'checking-history';
  if (
    c.includes('cat') ||
    c.includes('head') ||
    c.includes('sed') ||
    c.includes('tail') ||
    c.includes('less') ||
    c.includes('grep')
  ) {
    return 'inspecting-file';
  }
  return 'working';
};

type CommitStreamEvent =
  | { type: 'progress'; phase: CommitPhase }
  | { type: 'final'; suggestion: CommitMessageSuggestion }
  | { type: 'error'; message: string };

export type { CommitPhase, CommitStreamEvent };

// ─── Schemas ────────────────────────────────────────────────────────

const commitMessageSchema = z.object({
  subject: z.string(),
  body: z.string(),
  dangerFiles: z.array(z.string()),
});

const branchNameSchema = z.object({
  branchName: z.string(),
});

const dependencyDetectionSchema = z.object({
  flagged: z.array(
    z.object({
      hash: z.string(),
      reason: z.string(),
    }),
  ),
});

type CommitMessageSuggestion = z.infer<typeof commitMessageSchema>;
type BranchNameSuggestion = z.infer<typeof branchNameSchema>;
type DependencyDetection = z.infer<typeof dependencyDetectionSchema>;

export type {
  CommitMessageSuggestion,
  BranchNameSuggestion,
  DependencyDetection,
};

// ─── Diff Formatting ────────────────────────────────────────────────

const MAX_TOTAL_COMMIT_DIFF_CHARS = 24_000;
const MAX_PER_COMMIT_DIFF_CHARS = 4_000;

const formatCommitsForDependencyDetection = (
  commits: readonly {
    hash: string;
    message: string;
    diffs: readonly FileDiff[];
  }[],
): string => {
  const sections: string[] = [];
  let totalChars = 0;

  for (const c of commits) {
    const lines: string[] = [];
    lines.push(`### COMMIT ${c.hash}`);
    lines.push(`Subject: ${c.message.split('\n')[0]}`);
    lines.push('Files:');
    for (const d of c.diffs) {
      const prefix = d.isNew ? 'A' : d.isDeleted ? 'D' : 'M';
      lines.push(`  ${prefix} ${d.path}`);
    }
    lines.push('Diff:');

    let perCommitChars = 0;
    let truncated = false;
    for (const d of c.diffs) {
      if (truncated) break;
      lines.push(`--- ${d.path} ---`);
      for (const hunk of d.hunks) {
        if (truncated) break;
        lines.push(hunk.header);
        for (const line of hunk.lines) {
          const prefix =
            line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
          const text = `${prefix}${line.content}`;
          if (perCommitChars + text.length > MAX_PER_COMMIT_DIFF_CHARS) {
            lines.push('[... commit diff truncated]');
            truncated = true;
            break;
          }
          perCommitChars += text.length;
          lines.push(text);
        }
      }
    }

    const section = lines.join('\n');
    if (totalChars + section.length > MAX_TOTAL_COMMIT_DIFF_CHARS) {
      sections.push('[... remaining commits omitted due to size limit]');
      break;
    }
    totalChars += section.length;
    sections.push(section);
  }

  return sections.join('\n\n');
};

// ─── Prompt Builders ────────────────────────────────────────────────

const buildCommitMessagePrompt = (hint?: string): string => {
  const hintSection =
    hint && hint.trim()
      ? `The user has ALREADY drafted a commit message. Treat it as a HINT describing their intent — it is the most important signal of what this change is about and which wording/language they prefer. Your job is to REFINE it: keep its meaning and language, but fix the conventional-commit type/scope, tighten the wording, correct the format, and incorporate anything important from the staged diff that the draft missed. Do NOT discard the user's intent or switch languages. If the draft is already good, return it with only minimal corrections.

User's draft message:
"""
${hint.trim()}
"""

`
      : '';

  return `You are a git commit message generator following the Conventional Commits specification.
You are running as an agent inside the user's git repository. Gather everything you need yourself by running git commands.

The user has ALREADY staged the changes to commit. Inspect the staged changes by running: git diff --cached (a.k.a. git diff --staged). Do NOT look at unstaged working-tree changes.

Run git log (recent commits) and git show HEAD to study (1) the team's message style/language/scope conventions and (2) whether the current staged change is a continuation / fix / refactor of the previous commit, so the message reads naturally in sequence. Reflect that relationship in the wording when relevant, but DO NOT propose amend/fixup actions — only produce the message.

${hintSection}Rules:
- Format: <type>[optional scope]: <description>
- Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build, revert
- Scope is optional, derived from the area of change (e.g. auth, api, ui)
- Description: imperative mood, lowercase, no period at end, max 72 chars total
- subject field = the full first line including type, scope, and description
- body: only if the changes are complex; otherwise empty string
- If body is present, separate from subject with a blank line
- BREAKING CHANGE: add "!" after type/scope if breaking, and explain in body
- If recent commit messages show a consistent pattern (language, scope style, prefix conventions), follow that pattern

Security check (detect "dangerous git add" — files the user likely did NOT mean to commit):
- dangerFiles: array of staged file paths matching ANY rule below. Inspect each file's path AND every added line ("+") in its diff.
- Primarily inspect the added ('+') lines of the staged diff. If a staged file is genuinely suspicious and the diff is insufficient to decide (e.g. binary or ambiguous), you MAY read the file contents to confirm.

(A) Secret-bearing files by path / basename:
- Env files: .env, .env.local, .env.*.local, .envrc — EXCLUDE .env.example, .env.sample, .env.template, .env.defaults, .env.test (no real values)
- SSH / PGP keys: id_rsa, id_dsa, id_ecdsa, id_ed25519 (and *.pub counterparts when paired with private), *.pem, *.key, *.ppk, *.pgp, *.asc, *.gpg, authorized_keys, known_hosts
- Certificates / keystores: *.p12, *.pfx, *.jks, *.keystore, *.kdbx, *.crt, *.cer, *.der
- Cloud / service credentials: any file matching credentials*, secrets*, service-account*.json, *firebase-adminsdk*.json, gcloud-*.json, .aws/credentials, .aws/config, .gcloud/, .kube/config, .docker/config.json
- Auth tokens / registry: .npmrc, .yarnrc, .pypirc, .netrc, .htpasswd (when containing actual tokens — see content rules)
- Terraform / IaC state & vars: terraform.tfstate, terraform.tfstate.backup, *.tfvars (except *.tfvars.example), .terraform/
- Database dumps / local DBs: *.sqlite, *.sqlite3, *.db, *.dump, *.sql (only if it appears to contain real data — large file or rows of INSERT INTO)

(B) Hardcoded secret patterns in added diff lines (regex-style — interpret loosely):
- Assignment style with a real-looking value: (password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|bearer)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+=]{12,}
- AWS access key: AKIA[0-9A-Z]{16}; AWS secret: aws_secret_access_key with value
- Google API: AIza[0-9A-Za-z_\-]{35}; OAuth refresh: ya29\.
- GitHub: ghp_, gho_, ghs_, ghu_, ghr_, github_pat_
- Slack: xox[abprs]-[A-Za-z0-9-]+
- Stripe live: sk_live_, rk_live_
- OpenAI / Anthropic: sk-[A-Za-z0-9]{20,}, sk-ant-[A-Za-z0-9_\-]{20,}
- JWT: eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+
- PEM block: -----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----
- Credentials in URL: \w+://[^:\s]+:[^@\s/]+@ (e.g. postgres://user:pw@host, https://user:token@github.com)

(C) Likely accidentally-staged files (build artifacts / local junk that should be gitignored):
- Build / cache output: dist/, build/, out/, .next/, .turbo/, .nuxt/, .svelte-kit/, target/, bin/, obj/, coverage/, .nyc_output/
- Dependencies / vendored: node_modules/, vendor/, .venv/, venv/, __pycache__/, *.pyc
- Editor / OS junk: .DS_Store, Thumbs.db, desktop.ini, .idea/, *.iml — DO NOT flag .vscode/ (often shared)
- Backup / swap / merge leftovers: *.bak, *.swp, *.swo, *.orig, *.rej, *~, *.tmp
- Logs / pid: *.log, *.pid, npm-debug.log*, yarn-error.log*

False-positive guards (do NOT flag):
- Placeholder / example values: your_key_here, xxx, <TOKEN>, REPLACE_ME, "", "changeme", "example", $\{VAR\}, process.env.X — these are not real secrets
- Lockfile updates (pnpm-lock.yaml, package-lock.json, yarn.lock, Cargo.lock) unless they introduce a literal secret string
- README / docs that mention secret-shaped patterns inside code fences as documentation
- Test fixtures clearly under __tests__/, test/, fixtures/, mocks/ with synthetic data
- Anything in .env.example-class files (see exclusions in A)

Output:
- Include each unique file path AT MOST ONCE in dangerFiles
- If nothing matches, return an empty array

Respond with ONLY valid JSON matching the output schema { subject, body, dangerFiles }.`;
};

const buildBranchNamePrompt = (context: {
  commitMessage: string;
  commitHash?: string;
}): string => {
  const lines = [
    'Suggest a git branch name for the following commit.',
    'Rules:',
    '- Use kebab-case with a conventional prefix: feat/, fix/, refactor/, docs/, chore/, test/',
    '- Max 50 chars total',
    '- Respond with ONLY valid JSON matching the output schema',
    '',
  ];

  if (context.commitHash) {
    lines.push(`Commit: ${context.commitHash}`);
  }
  lines.push(`Commit message: ${context.commitMessage}`);

  return lines.join('\n');
};

const buildDependencyDetectionPrompt = (
  commitsText: string,
): string => `You analyze a set of git commits and identify any that update package dependencies (version bumps).

A commit is "dependency-updating" if it changes any of the following:
- Lockfiles for package managers: pnpm-lock.yaml, package-lock.json, yarn.lock, npm-shrinkwrap.json, bun.lockb, Cargo.lock, Gemfile.lock, Pipfile.lock, poetry.lock, uv.lock, composer.lock, go.sum, mix.lock, Podfile.lock, flake.lock
- Manifest files where the diff modifies a version string or dependency entry: package.json, pyproject.toml, requirements*.txt, Pipfile, Gemfile, Cargo.toml, go.mod, composer.json, mix.exs, build.gradle, build.gradle.kts, pubspec.yaml, *.gemspec, .tool-versions, .nvmrc, .python-version, .ruby-version, asdf-related files
- Generated artifacts of dependency tooling (e.g. vendor/ directory updates, third_party/ updates clearly tied to a version bump)

Do NOT flag:
- Pure source code changes that happen to live in package directories
- Changes to package.json that ONLY modify "scripts", "name", "description", "keywords", "license", "author", "repository" fields (no dependency or version field touched)
- Lockfile-shaped files inside test fixtures (e.g. __tests__/, fixtures/, examples/)

For each commit you decide IS dependency-updating, add it to "flagged" with:
- hash: the full 40-char SHA (copy verbatim from the input)
- reason: one short sentence (Japanese OK) describing why, mentioning the specific file(s)

If no commits qualify, return an empty flagged array.

Respond with ONLY valid JSON matching the output schema.

Commits to analyze:

${commitsText}`;

// ─── Codex Agent ────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000;

const extractJson = (text: string): string => {
  const fenceMatch = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(text);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceMatch = /\{[\s\S]*\}/.exec(text);
  if (braceMatch) return braceMatch[0];

  return text.trim();
};

const runCodexAgent = async <T>(
  prompt: string,
  schema: z.ZodType<T>,
  model: string,
): Promise<T> => {
  const codex = new Codex();
  const thread = codex.startThread({
    model,
    modelReasoningEffort: 'low',
    sandboxMode: 'read-only',
    skipGitRepoCheck: true,
    approvalPolicy: 'never',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const turn = await thread.run(prompt, {
      outputSchema: z.toJSONSchema(schema),
      signal: controller.signal,
    });

    const json = extractJson(turn.finalResponse);
    return schema.parse(JSON.parse(json));
  } finally {
    clearTimeout(timeoutId);
  }
};

// ─── Public API ─────────────────────────────────────────────────────

export async function* streamCommitMessage(
  repo: string,
  model: string,
  options: { unlimited: boolean; hint?: string; signal?: AbortSignal },
): AsyncGenerator<CommitStreamEvent> {
  const codex = new Codex();
  const thread = codex.startThread({
    model,
    modelReasoningEffort: 'medium',
    sandboxMode: 'read-only',
    workingDirectory: repo,
    skipGitRepoCheck: true,
    approvalPolicy: 'never',
  });

  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options.unlimited ? 600_000 : 60_000;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort());
    }
  }

  const prompt = buildCommitMessagePrompt(options.hint);

  try {
    const { events } = await thread.runStreamed(prompt, {
      outputSchema: z.toJSONSchema(commitMessageSchema),
      signal: controller.signal,
    });

    let lastPhase: CommitPhase | null = null;
    let agentText = '';

    for await (const ev of events) {
      if (
        ev.type === 'item.started' ||
        ev.type === 'item.updated' ||
        ev.type === 'item.completed'
      ) {
        const item = ev.item;
        if (item.type === 'command_execution') {
          const phase = classifyCommand(item.command);
          if (phase !== lastPhase) {
            lastPhase = phase;
            yield { type: 'progress', phase };
          }
        } else if (item.type === 'agent_message') {
          agentText = item.text;
        }
      } else if (ev.type === 'turn.failed') {
        throw new Error(ev.error.message);
      } else if (ev.type === 'error') {
        throw new Error(ev.message);
      }
    }

    const json = extractJson(agentText);
    const suggestion = commitMessageSchema.parse(JSON.parse(json));
    yield { type: 'final', suggestion };
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      if (timedOut) {
        throw new Error('AI suggestion timed out');
      }
      // Client cancelled — the consumer is gone; stop silently.
      return;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const suggestBranchName = async (
  context: {
    commitMessage: string;
    commitHash?: string;
  },
  model: string,
): Promise<BranchNameSuggestion> => {
  const prompt = buildBranchNamePrompt(context);
  return runCodexAgent(prompt, branchNameSchema, model);
};

export const detectDependencyCommits = async (
  commits: readonly {
    hash: string;
    message: string;
    diffs: readonly FileDiff[];
  }[],
  model: string,
): Promise<DependencyDetection> => {
  const commitsText = formatCommitsForDependencyDetection(commits);
  const prompt = buildDependencyDetectionPrompt(commitsText);
  return runCodexAgent(prompt, dependencyDetectionSchema, model);
};
