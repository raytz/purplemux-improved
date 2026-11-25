import type { NextApiRequest, NextApiResponse } from 'next';
import { buildCodexRuntimeArgs } from '@/lib/providers/codex';
import { buildCodexHookFlags } from '@/lib/providers/codex/hook-config';
import { getActiveWorkspaceId } from '@/lib/workspace-store';
import { createLogger } from '@/lib/logger';
import { getConfig } from '@/lib/config-store';

const log = createLogger('codex-launch-args');

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as { workspaceId?: unknown; resumeSessionId?: unknown; hooksOnly?: unknown } | undefined;

  try {
    res.setHeader('Cache-Control', 'no-store');
    if (body?.hooksOnly === true) {
      const { args } = await buildCodexHookFlags();
      return res.status(200).json({ args, env: {} });
    }
    const workspaceId = stringOrNull(body?.workspaceId) ?? await getActiveWorkspaceId();
    const resumeSessionId = stringOrNull(body?.resumeSessionId) ?? undefined;
    const args = await buildCodexRuntimeArgs(workspaceId ?? undefined, resumeSessionId);
    const { codexEnvironment = {} } = await getConfig();
    return res.status(200).json({ args, env: codexEnvironment });
  } catch (err) {
    log.error(`codex launch args build failed: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: 'Failed to build Codex launch args' });
  }
};

export default handler;
