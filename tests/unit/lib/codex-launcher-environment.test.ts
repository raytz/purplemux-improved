import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() }) }));
import { CODEX_LAUNCHER_SCRIPT_CONTENT } from '@/lib/providers/codex';

const runLauncher = async (response: object, argv: string[] = [], help: string | Error = '', viaShim = false) => {
  const spawn = vi.fn(() => ({ on: vi.fn() }));
  const execFileSync = vi.fn(() => {
    if (help instanceof Error) throw help;
    return help;
  });
  const exit = vi.fn();
  const fetch = vi.fn(async (_url: string, _options: { body: string }) => ({ ok: true, json: async () => response }));
  const inherited = { PATH: viaShim ? '/tmp/.purplemux/codex-bin:/bin' : '/bin', HTTPS_PROXY: 'inherited', KEEP: 'yes' };
  vm.runInNewContext(CODEX_LAUNCHER_SCRIPT_CONTENT, {
    require: (name: string) => {
      if (name === 'node:child_process') return { spawn, execFileSync };
      if (name === 'node:fs') return { readFileSync: () => '1234' };
      if (name === 'node:os') return { homedir: () => '/tmp' };
      if (name === 'node:path') return { join: (...parts: string[]) => parts.join('/') };
      throw new Error(`Unexpected module: ${name}`);
    },
    process: { argv: ['node', 'launcher', ...(viaShim ? ['--shell-launch'] : []), ...argv], env: inherited, exit },
    console: { error: vi.fn() },
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  await vi.waitFor(() => expect(spawn.mock.calls.length + exit.mock.calls.length).toBeGreaterThan(0));
  return { spawn, exit, fetch, inherited, execFileSync };
};

describe('Codex launcher environment', () => {
  it.each([['--help'], ['-h'], ['--version'], ['-V'], ['--no-daemon', '--version']])(
    'passes informational query through without a server or capability probe: %j', async (...args) => {
      const { spawn, fetch, execFileSync } = await runLauncher({}, args, '', true);
      expect(fetch).not.toHaveBeenCalled();
      expect(execFileSync).not.toHaveBeenCalled();
      expect(spawn).toHaveBeenCalledWith('codex', args, expect.objectContaining({ env: expect.objectContaining({ PATH: '/bin' }) }));
    });
  it.each([
    { argv: ['--no-daemon', 'hello'], expected: ['-c', 'hooks', '--no-daemon', 'hello'] },
    { argv: ['--', '--no-daemon'], expected: ['--no-daemon', '-c', 'hooks', '--', '--no-daemon'] },
    { argv: ['--', '--help'], expected: ['--no-daemon', '-c', 'hooks', '--', '--help'] },
  ])('keeps native option and prompt boundaries for $argv', async ({ argv, expected }) => {
    const { spawn, fetch } = await runLauncher({ args: ['-c', 'hooks'] }, argv, '--no-daemon', true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledWith('codex', expected, expect.any(Object));
  });
  it('forwards shell argv literally without sending the prompt to the launch API', async () => {
    const argv = ['--model', 'custom', '请保留 "$HOME"、\' 和 `cmd`\n--resume-session-id literal'];
    const { spawn, fetch, inherited } = await runLauncher({ args: ['-c', 'hooks.Stop=[]'], env: {} }, ['--shell-launch', ...argv]);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ hooksOnly: true });
    expect(spawn).toHaveBeenCalledWith('codex', ['-c', 'hooks.Stop=[]', ...argv], { stdio: 'inherit', env: inherited });
  });
  it.each([['-c', 'hooks.Stop=[]'], ['resume', 'session', '-c', 'hooks.Stop=[]']])(
    'explicitly selects embedded mode when supported: %j', async (...args) => {
      const env = { PATH: '/custom/bin' };
      const { spawn, execFileSync } = await runLauncher({ args: [...args], env }, [], '  --no-daemon  Run without the shared background server');
      expect(spawn).toHaveBeenCalledWith('codex', ['--no-daemon', ...args], expect.any(Object));
      expect(execFileSync).toHaveBeenCalledWith('codex', ['--help'], expect.objectContaining({
        env: expect.objectContaining(env), timeout: 5000,
      }));
    },
  );

  it('still launches when the capability probe fails', async () => {
    const { spawn } = await runLauncher({ args: ['-c', 'hooks.Stop=[]'] }, [], new Error('timeout'));
    expect(spawn).toHaveBeenCalledWith('codex', ['-c', 'hooks.Stop=[]'], expect.any(Object));
  });

  it.each([[], ['--resume-session-id', 'session']])('merges configured values for launch/resume: %j', async (...argv) => {
    const env = { HTTPS_PROXY: 'configured', TOKEN: 'a=b; $HOME', EMPTY: '' };
    const { spawn, inherited, fetch } = await runLauncher({ args: ['--test'], env }, argv);
    expect(spawn).toHaveBeenCalledWith('codex', ['--test'], {
      stdio: 'inherit', env: { PATH: '/bin', KEEP: 'yes', ...env },
    });
    expect(inherited.HTTPS_PROXY).toBe('inherited');
    const request = JSON.parse(fetch.mock.calls[0][1].body);
    expect(request.resumeSessionId).toBe(argv[1] ?? null);
  });

  it('inherits the environment when no overrides are configured', async () => {
    const { spawn, inherited } = await runLauncher({ args: [] });
    expect(spawn).toHaveBeenCalledWith('codex', [], { stdio: 'inherit', env: inherited });
  });

  it.each([{ NAME: 3 }, { 'BAD=NAME': 'x' }, { NAME: '\0' }, []])('rejects malformed environment: %j', async (env) => {
    const { spawn, exit } = await runLauncher({ args: [], env });
    expect(spawn).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
