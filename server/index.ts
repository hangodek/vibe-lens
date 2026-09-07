import { serve } from "bun";

const PORT = 4242;

interface ToolStatus {
  agy: boolean;
  opencode: boolean;
  claude: boolean;
  ollama: boolean;
}

function detectTools(): ToolStatus {
  return {
    agy: !!Bun.which("agy"),
    opencode: !!Bun.which("opencode"),
    claude: !!Bun.which("claude"),
    ollama: !!Bun.which("ollama"),
  };
}

async function runCliTool(
  tool: string,
  prompt: string,
  onChunk?: (text: string) => void
): Promise<string> {
  let cmd: string[] = [];

  if (tool === "agy") {
    cmd = [
      "agy",
      "-p",
      prompt,
      "--print-timeout",
      "5m0s",
      "--dangerously-skip-permissions",
    ];
  } else if (tool === "opencode") {
    cmd = ["opencode", "run", "--pure", prompt];
  } else if (tool === "claude") {
    cmd = ["claude", "-p", prompt];
  } else {
    throw new Error(`Unsupported CLI tool: ${tool}`);
  }

  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const decoder = new TextDecoder();
  let fullOutput = "";

  if (proc.stdout) {
    const reader = proc.stdout.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      fullOutput += text;
      if (onChunk) onChunk(text);
    }
  }

  await proc.exited;
  return fullOutput.trim();
}

const server = serve<{ wsId: string }>({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { wsId: Math.random().toString(36).substring(2) },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    };

    // Health check & tool discovery
    if (url.pathname === "/api/health" && req.method === "GET") {
      const tools = detectTools();
      return new Response(
        JSON.stringify({ status: "ok", port: PORT, tools }),
        { headers: corsHeaders }
      );
    }

    // Direct HTTP Analyze
    if (url.pathname === "/api/analyze" && req.method === "POST") {
      return (async () => {
        try {
          const body = (await req.json()) as { tool: string; prompt: string };
          const { tool = "agy", prompt } = body;
          if (!prompt) {
            return new Response(
              JSON.stringify({ error: "Missing prompt" }),
              { status: 400, headers: corsHeaders }
            );
          }

          const output = await runCliTool(tool, prompt);
          return new Response(JSON.stringify({ output }), {
            headers: corsHeaders,
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Execution error" }),
            { status: 500, headers: corsHeaders }
          );
        }
      })();
    }

    // Direct HTTP Ask (single file Q&A)
    if (url.pathname === "/api/ask" && req.method === "POST") {
      return (async () => {
        try {
          const body = (await req.json()) as {
            tool: string;
            file: string;
            question: string;
            code?: string;
          };
          const { tool = "agy", file, question, code = "" } = body;
          const prompt = `You are an expert software engineer inspecting the file: ${file}.\n\nSource code excerpt:\n${code.slice(0, 4000)}\n\nQuestion: ${question}\n\nProvide a concise, direct, helpful answer explaining the architecture, dependencies, and behavior.`;

          const output = await runCliTool(tool, prompt);
          return new Response(JSON.stringify({ reply: output }), {
            headers: corsHeaders,
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Execution error" }),
            { status: 500, headers: corsHeaders }
          );
        }
      })();
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },
  websocket: {
    open(_ws) {},
    async message(ws, message) {
      try {
        const data = JSON.parse(String(message));
        if (data.type === "ping") {
          ws.send(
            JSON.stringify({
              type: "pong",
              tools: detectTools(),
            })
          );
          return;
        }

        if (data.type === "analyze" || data.type === "ask") {
          const { id, tool = "agy", prompt } = data;
          try {
            const output = await runCliTool(tool, prompt, (chunk) => {
              ws.send(JSON.stringify({ type: "chunk", id, chunk }));
            });
            ws.send(JSON.stringify({ type: "done", id, output }));
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: "error",
                id,
                error: err?.message || "Tool execution failed",
              })
            );
          }
        }
      } catch (err: any) {
        ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      }
    },
    close(_ws) {},
  },
});

console.log(`[VibeLens Companion] Server running on http://localhost:${PORT}`);
