import { NextResponse } from 'next/server';
import { z } from 'zod';

import { streamCommitMessage, suggestBranchName } from '@/lib/ai';
import type { CommitStreamEvent } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

const DEFAULT_MODEL = 'gpt-5.3-codex-spark';

// ─── Request Schemas ────────────────────────────────────────────────

const commitMessageBody = z.object({
  type: z.literal('commit-message'),
  repo: z.string().min(1),
  unlimited: z.boolean().optional(),
  hint: z.string().optional(),
});

const branchNameBody = z.object({
  type: z.literal('branch-name'),
  commitMessage: z.string(),
  commitHash: z.string().optional(),
});

const bodySchema = z.discriminatedUnion('type', [
  commitMessageBody,
  branchNameBody,
]);

// ─── Handler ────────────────────────────────────────────────────────

export const POST = async (request: Request): Promise<Response> => {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const [enabledRow, modelRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'aiEnabled' } }),
    prisma.setting.findUnique({ where: { key: 'aiModel' } }),
  ]);

  if (enabledRow?.value !== 'true') {
    return NextResponse.json(
      { error: 'AI suggestions are disabled' },
      { status: 403 },
    );
  }

  const model = modelRow?.value || DEFAULT_MODEL;

  if (parsed.data.type === 'commit-message') {
    const { repo, unlimited, hint } = parsed.data;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (e: CommitStreamEvent): void => {
          controller.enqueue(
            encoder.encode('data: ' + JSON.stringify(e) + '\n\n'),
          );
        };
        try {
          for await (const ev of streamCommitMessage(repo, model, {
            unlimited: unlimited ?? false,
            hint,
            signal: request.signal,
          })) {
            send(ev);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          try {
            send({ type: 'error', message });
          } catch {
            /* client gone */
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  try {
    const suggestion = await suggestBranchName(
      {
        commitMessage: parsed.data.commitMessage,
        commitHash: parsed.data.commitHash,
      },
      model,
    );
    return NextResponse.json(suggestion);
  } catch (error: unknown) {
    console.error('[api/ai/suggest] failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Codex timeout' || message.includes('aborted')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
};
