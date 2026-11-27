/* eslint-disable @typescript-eslint/no-require-imports */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readBasePath, readBakedBasePath, resolveBasePath, normalizeBasePath } =
  require('../../scripts/read-base-path.cjs');

let workspace;
let home;
let originalHome;

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'pmux-base-path-'));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'pmux-base-home-'));
  originalHome = process.env.HOME;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
});

afterEach(() => {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  if (originalHome === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = originalHome;
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

const writeArtifact = (dir, basePath) => {
  const file = path.join(dir, '.next', 'standalone', '.next', 'required-server-files.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 1, config: { basePath } }));
  return file;
};

test('normalizeBasePath canonicalizes user supplied values', () => {
  assert.equal(normalizeBasePath('/purplemux'), '/purplemux');
  assert.equal(normalizeBasePath('purplemux'), '/purplemux');
  assert.equal(normalizeBasePath('/purplemux/'), '/purplemux');
  assert.equal(normalizeBasePath('/'), '');
  assert.equal(normalizeBasePath(''), '');
  assert.equal(normalizeBasePath(undefined), '');
});

test('readBasePath prefers the workspace config file over the user config', () => {
  fs.mkdirSync(path.join(home, '.purplemux'), { recursive: true });
  fs.writeFileSync(path.join(home, '.purplemux', 'config.json'), JSON.stringify({ basePath: '/from-home' }));
  assert.equal(readBasePath(workspace), '/from-home');
  fs.writeFileSync(path.join(workspace, 'purplemux.config.json'), JSON.stringify({ basePath: '/from-workspace' }));
  assert.equal(readBasePath(workspace), '/from-workspace');
});

test('readBakedBasePath reads the standalone build artifact', () => {
  writeArtifact(workspace, '/purplemux');
  assert.equal(readBakedBasePath(workspace), '/purplemux');
});

test('readBakedBasePath falls back to the plain build artifact', () => {
  const file = path.join(workspace, '.next', 'required-server-files.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 1, config: { basePath: '/plain' } }));
  assert.equal(readBakedBasePath(workspace), '/plain');
});

test('readBakedBasePath returns undefined when there is no build artifact', () => {
  assert.equal(readBakedBasePath(workspace), undefined);
});

test('resolveBasePath prefers the build artifact over the config file', () => {
  writeArtifact(workspace, '/purplemux');
  fs.writeFileSync(path.join(workspace, 'purplemux.config.json'), JSON.stringify({ basePath: '/from-config' }));
  const resolved = resolveBasePath(workspace);
  assert.equal(resolved.basePath, '/purplemux');
  assert.equal(resolved.baked, '/purplemux');
  assert.equal(resolved.configured, '/from-config');
});

test('resolveBasePath ignores the build artifact when it is disabled', () => {
  writeArtifact(workspace, '/purplemux');
  fs.writeFileSync(path.join(workspace, 'purplemux.config.json'), JSON.stringify({ basePath: '/from-config' }));
  const resolved = resolveBasePath(workspace, { useBuildArtifact: false });
  assert.equal(resolved.basePath, '/from-config');
  assert.equal(resolved.baked, undefined);
});
