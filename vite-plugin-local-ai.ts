import type { Plugin } from 'vite';
import { spawn } from 'node:child_process';

function checkBin(bin: string): boolean {
  try {
    if (typeof (globalThis as any).Bun !== 'undefined' && (globalThis as any).Bun.which) {
      return !!(globalThis as any).Bun.which(bin);
    }
  } catch {}
  try {
    const { execSync } = require('node:child_process');
    execSync(`which ${bin}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function spawnTool(tool: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let cmd = 'claude';
    let args: string[] = ['-p', prompt];

    if (tool === 'agy') {
      cmd = 'agy';
      args = ['-p', prompt, '--print-timeout', '3m0s', '--dangerously-skip-permissions'];
    } else if (tool === 'opencode') {
      cmd = 'opencode';
      args = ['run', '--pure', prompt];
    }

    const child = spawn(cmd, args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      const text = stdout.trim();
      if (code !== 0 && !text) {
        reject(new Error(stderr.trim() || `CLI ${cmd} exited with code ${code}`));
      } else if (text.toLowerCase().includes('quota reached') || text.toLowerCase().includes('rate limit')) {
        reject(new Error(text || 'Quota limit reached'));
      } else {
        resolve(text);
      }
    });
  });
}

async function runCliTool(tool: string, prompt: string): Promise<string> {
  const toolsToTry = [tool];
  if (tool !== 'claude' && checkBin('claude')) toolsToTry.push('claude');
  if (tool !== 'agy' && checkBin('agy')) toolsToTry.push('agy');
  if (tool !== 'opencode' && checkBin('opencode')) toolsToTry.push('opencode');

  let lastErr: any = null;
  for (const t of toolsToTry) {
    try {
      const out = await spawnTool(t, prompt);
      if (out && !out.toLowerCase().includes('quota reached')) {
        return out;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('CLI tool execution failed');
}

export function localAiPlugin(): Plugin {
  return {
    name: 'vibe-local-ai-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost:5173') : null;
        if (!url || !url.pathname.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/api/health' && req.method === 'GET') {
          const tools = {
            agy: checkBin('agy'),
            opencode: checkBin('opencode'),
            claude: checkBin('claude'),
            ollama: checkBin('ollama'),
          };
          return res.end(JSON.stringify({ status: 'ok', tools, embedded: true }));
        }

        if (url.pathname === '/api/analyze' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { tool = 'agy', prompt } = JSON.parse(body || '{}');
              if (!prompt) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Missing prompt' }));
              }
              const output = await runCliTool(tool, prompt);
              res.end(JSON.stringify({ output }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || 'Execution error' }));
            }
          });
          return;
        }

        if (url.pathname === '/api/ask' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { tool = 'agy', file, question, code = '' } = JSON.parse(body || '{}');
              const prompt = `You are an expert software engineer inspecting the file: ${file}.\n\nSource code excerpt:\n${code.slice(0, 4000)}\n\nQuestion: ${question}\n\nProvide a concise, direct, helpful answer explaining what this code does, what enters it, what it returns, and what is passed.`;
              const reply = await runCliTool(tool, prompt);
              res.end(JSON.stringify({ reply }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || 'Execution error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
