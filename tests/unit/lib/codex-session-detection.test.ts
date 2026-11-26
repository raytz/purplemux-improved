import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { codexHookEvents } from '@/lib/providers/codex/hook-events';
import {
  findCodexSessionById,
  findLatestCodexSessionForCwd,
  watchSessionsDir,
} from '@/lib/providers/codex/session-detection';
import type { ISessionInfo } from '@/types/timeline';
import { createCodexParser } from '@/lib/session-parser-codex';

describe('codex watchSessionsDir', () => {
  it('forwards matching hook session-info events and unsubscribes on stop', () => {
    const info: ISessionInfo = {
      status: 'running',
      sessionId: '11111111-1111-4111-8111-111111111111',
      jsonlPath: '/tmp/rollout-11111111-1111-4111-8111-111111111111.jsonl',
      pid: null,
      startedAt: null,
      cwd: '/tmp/project',
    };
    const onChange = vi.fn();
    const watcher = watchSessionsDir(12345, onChange, {
      skipInitial: true,
      tmuxSession: 'target-session',
    });

    codexHookEvents.emit('session-info', 'other-session', info);
    expect(onChange).not.toHaveBeenCalled();

    codexHookEvents.emit('session-info', 'target-session', info);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(info);

    watcher.stop();
    codexHookEvents.emit('session-info', 'target-session', info);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('findCodexSessionById outside the recent window', () => {
  it('finds a long-lived session across years and reads its current turn', async () => {
    const sessionsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-old-session-'));
    const dayDir = path.join(sessionsRoot, '2024', '12', '31');
    await fs.mkdir(dayDir, { recursive: true });
    const sessionId = '44444444-4444-4444-8444-444444444444';
    const jsonlPath = path.join(dayDir, `rollout-${sessionId}.jsonl`);
    await fs.writeFile(jsonlPath, [
      { type: 'session_meta', payload: { id: sessionId, cwd: '/tmp/project' } },
      { type: 'event_msg', payload: { type: 'user_message', message: 'question' } },
      { type: 'event_msg', payload: { type: 'agent_message', message: 'answer' } },
    ].map((record) => JSON.stringify(record)).join('\n') + '\n');

    const options = { sessionsRoot, now: new Date('2026-05-02T12:00:00') };
    const session = await findCodexSessionById(sessionId, options);
    expect(session?.jsonlPath).toBe(jsonlPath);
    const turn = await createCodexParser(session!.jsonlPath).parseTurn();
    expect(turn.entries).toMatchObject([
      { type: 'user-message', text: 'question' },
      { type: 'assistant-message', markdown: 'answer' },
    ]);
    expect(await findCodexSessionById(sessionId, { ...options, daysBack: 30 })).toBeNull();
  });

  it('checks session metadata, skips invalid candidates and prefers recent matches', async () => {
    const sessionsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-identity-'));
    const recentDir = path.join(sessionsRoot, '2026', '05', '02');
    const invalidDir = path.join(sessionsRoot, '2025', '05', '02');
    const oldDir = path.join(sessionsRoot, '2024', '05', '02');
    await Promise.all([recentDir, invalidDir, oldDir].map((dir) => fs.mkdir(dir, { recursive: true })));
    const sessionId = '55555555-5555-4555-8555-555555555555';
    const candidate = `rollout-${sessionId}.jsonl`;
    const oldPath = path.join(oldDir, candidate);
    await fs.writeFile(path.join(recentDir, candidate), JSON.stringify({ type: 'session_meta', payload: { id: 'other' } }));
    await fs.writeFile(path.join(invalidDir, candidate), '{invalid');
    await fs.writeFile(oldPath, JSON.stringify({ type: 'session_meta', payload: { id: sessionId } }));
    const options = { sessionsRoot, now: new Date('2026-05-02T12:00:00') };
    expect((await findCodexSessionById(sessionId, options))?.jsonlPath).toBe(oldPath);
    expect(await findCodexSessionById('missing', options)).toBeNull();

    const recentPath = path.join(recentDir, `new-${sessionId}.jsonl`);
    await fs.writeFile(recentPath, JSON.stringify({ type: 'session_meta', payload: { id: sessionId } }));
    expect((await findCodexSessionById(sessionId, options))?.jsonlPath).toBe(recentPath);
  });
});

describe('findLatestCodexSessionForCwd', () => {
  it('returns the most recently modified Codex session for a cwd', async () => {
    const sessionsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-sessions-'));
    const dayDir = path.join(sessionsRoot, '2026', '05', '02');
    await fs.mkdir(dayDir, { recursive: true });

    const projectCwd = '/tmp/project-a';
    const oldPath = path.join(dayDir, 'rollout-old.jsonl');
    const latestPath = path.join(dayDir, 'rollout-latest.jsonl');
    const otherPath = path.join(dayDir, 'rollout-other.jsonl');

    await fs.writeFile(oldPath, JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-05-02T01:00:00.000Z',
      payload: {
        id: '11111111-1111-4111-8111-111111111111',
        timestamp: '2026-05-02T01:00:00.000Z',
        cwd: projectCwd,
      },
    }) + '\n');
    await fs.writeFile(latestPath, JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-05-02T02:00:00.000Z',
      payload: {
        id: '22222222-2222-4222-8222-222222222222',
        timestamp: '2026-05-02T02:00:00.000Z',
        cwd: projectCwd,
      },
    }) + '\n');
    await fs.writeFile(otherPath, JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-05-02T03:00:00.000Z',
      payload: {
        id: '33333333-3333-4333-8333-333333333333',
        timestamp: '2026-05-02T03:00:00.000Z',
        cwd: '/tmp/project-b',
      },
    }) + '\n');

    await fs.utimes(oldPath, new Date('2026-05-02T01:00:00.000Z'), new Date('2026-05-02T01:00:00.000Z'));
    await fs.utimes(latestPath, new Date('2026-05-02T03:00:00.000Z'), new Date('2026-05-02T03:00:00.000Z'));
    await fs.utimes(otherPath, new Date('2026-05-02T04:00:00.000Z'), new Date('2026-05-02T04:00:00.000Z'));

    const session = await findLatestCodexSessionForCwd(projectCwd, {
      sessionsRoot,
      daysBack: 1,
      now: new Date('2026-05-02T12:00:00.000Z'),
    });

    expect(session?.sessionId).toBe('22222222-2222-4222-8222-222222222222');
    expect(session?.jsonlPath).toBe(latestPath);
    expect(session?.startedAt).toBe(new Date('2026-05-02T02:00:00.000Z').getTime());
  });

  it('resolves a Codex session by id without using cwd recency', async () => {
    const sessionsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-session-id-'));
    const dayDir = path.join(sessionsRoot, '2026', '05', '02');
    await fs.mkdir(dayDir, { recursive: true });

    const sessionId = '44444444-4444-4444-8444-444444444444';
    const jsonlPath = path.join(dayDir, `rollout-2026-05-02T03-00-00-${sessionId}.jsonl`);
    await fs.writeFile(jsonlPath, JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-05-02T03:00:00.000Z',
      payload: {
        id: sessionId,
        timestamp: '2026-05-02T03:00:00.000Z',
        cwd: '/tmp/project-a',
      },
    }) + '\n');

    const session = await findCodexSessionById(sessionId, {
      sessionsRoot,
      daysBack: 1,
      now: new Date('2026-05-02T12:00:00.000Z'),
    });

    expect(session?.sessionId).toBe(sessionId);
    expect(session?.jsonlPath).toBe(jsonlPath);
  });
});
