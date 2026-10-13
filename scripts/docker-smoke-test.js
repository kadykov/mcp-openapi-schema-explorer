#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const fixturesDir = path.resolve(repoRoot, 'test', 'fixtures');
const defaultFixturePath = path.resolve(fixturesDir, 'sample-api.json');

function printUsage() {
  console.log('Usage: node scripts/docker-smoke-test.js [IMAGE_TAG]');
}

function resolveFixturePath() {
  const requestedPath = process.env.FIXTURE_PATH;
  const candidatePath = requestedPath ? path.resolve(repoRoot, requestedPath) : defaultFixturePath;

  if (candidatePath === defaultFixturePath) {
    return candidatePath;
  }

  const relativePath = path.relative(fixturesDir, candidatePath);
  const isInsideFixturesDir =
    relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

  if (!isInsideFixturesDir) {
    console.error(`FIXTURE_PATH must resolve to a file inside ${fixturesDir}`);
    process.exit(1);
  }

  return candidatePath;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const imageTag = args[0] ?? 'mcp-openapi-schema-explorer:smoke';
const fixturePath = resolveFixturePath();

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    console.error(`${command} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

runCommand('docker', ['build', '-t', imageTag, '.']);

const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'docker-smoke',
      version: '1.0.0',
    },
  },
};

const notificationsInitialized = {
  jsonrpc: '2.0',
  method: 'notifications/initialized',
};

const dockerRun = spawnSync(
  'docker',
  ['run', '--rm', '-i', '-v', `${fixturePath}:/spec/api.json:ro`, imageTag, '/spec/api.json'],
  {
    cwd: repoRoot,
    input: `${JSON.stringify(initializeRequest)}\n${JSON.stringify(notificationsInitialized)}\n`,
    encoding: 'utf8',
  }
);

if (dockerRun.error) {
  console.error(`docker run failed to start: ${dockerRun.error.message}`);
  process.exit(1);
}

if (dockerRun.status !== 0) {
  console.error(`docker run exited with status ${dockerRun.status}`);
  process.exit(dockerRun.status ?? 1);
}

const messages = [];
for (const line of (dockerRun.stdout ?? '').split(/\r?\n/)) {
  if (!line.trim()) {
    continue;
  }

  try {
    messages.push(JSON.parse(line));
  } catch {
    // Ignore non-JSON lines that may be emitted by the container or by Docker.
  }
}

const hasValidInitializeResponse = messages.some(message => {
  return (
    message &&
    message.jsonrpc === '2.0' &&
    String(message.id) === '1' &&
    message.result &&
    typeof message.result === 'object' &&
    'serverInfo' in message.result
  );
});

if (!hasValidInitializeResponse) {
  console.error('docker smoke test failed: initialize response was not received');
  console.error(JSON.stringify(messages, null, 2));
  process.exit(1);
}

console.log('docker smoke test passed');
