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

function spawnTool(tool: string, prompt: string, timeoutMs = 65000): Promise<string> {
  return new Promise((resolve, reject) => {
    let cmd = 'opencode';
    let args: string[] = ['run', '--pure', prompt];

    if (tool === 'claude') {
      cmd = 'claude';
      args = ['-p', prompt];
    } else if (tool === 'agy') {
      cmd = 'agy';
      args = ['-p', prompt, '--print-timeout', '30s', '--dangerously-skip-permissions'];
    }

    const child = spawn(cmd, args, {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {}
      reject(new Error(`CLI tool ${cmd} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout?.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!timedOut) reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

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
  // Execute the exact tool requested by the user
  const out = await spawnTool(tool, prompt, 60000);
  if (out) return out;
  throw new Error(`CLI tool ${tool} returned empty output`);
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
            opencode: checkBin('opencode'),
            agy: checkBin('agy'),
            claude: checkBin('claude'),
            ollama: checkBin('ollama'),
          };
          return res.end(JSON.stringify({ status: 'ok', tools, embedded: true, primary: 'opencode' }));
        }

        if (url.pathname === '/api/analyze' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { tool = 'opencode', prompt } = JSON.parse(body || '{}');
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
              const { tool = 'opencode', file, question, code = '' } = JSON.parse(body || '{}');
              const prompt = `You are an expert software engineer explaining code to a vibe coder.\nFile: ${file}\nSource excerpt:\n${code.slice(0, 4000)}\nQuestion: ${question}\nExplain what happens, what data enters, what code line runs, and what is passed.`;
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
