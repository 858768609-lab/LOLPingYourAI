#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const [command = 'status', ...args] = process.argv.slice(2);
const directory = process.env.LOLPINGAI_DATA_DIR ?? (process.platform === 'darwin' ? join(homedir(), 'Library/Application Support/LOLPingYourAI') : join(process.env.APPDATA ?? homedir(), 'LOLPingYourAI'));
try {
  const { endpoint, token } = JSON.parse(await readFile(join(directory, 'bridge.json'), 'utf8'));
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error('Invalid bridge endpoint');
  const allowed = ['doctor', 'status', 'stop', 'bind', 'ping', 'config'];
  if (!allowed.includes(command)) throw new Error(`Commands: ${allowed.join(', ')}`);
  const body = args[0] === '--file' ? JSON.parse(await readFile(args[1], 'utf8')) : args[0] ? JSON.parse(args[0]) : {};
  const response = await fetch(`${endpoint}/${command}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error);
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(`LOLPingYourAI: ${error.message}. Start the desktop app first.`); process.exitCode = 1; }
