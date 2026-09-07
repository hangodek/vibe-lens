import { useState, useEffect, useRef } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface AIAssistantDrawerProps {
  file: ParsedCodeFile;
  initialQuestion?: string;
  onClearInitialQuestion?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistantDrawer({
  file,
  initialQuestion,
  onClearInitialQuestion,
}: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I am your Vibe Architecture Assistant. Ask me anything about **${file.name}**, its inputs/outputs, or how to prompt local AI CLIs to modify it safely.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialQuestion) {
      handleAskQuestion(initialQuestion);
      if (onClearInitialQuestion) onClearInitialQuestion();
    }
  }, [initialQuestion]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  async function handleAskQuestion(queryText: string) {
    if (!queryText.trim() || isThinking) return;

    setMessages((prev) => [...prev, { role: 'user', content: queryText }]);
    setInput('');
    setIsThinking(true);

    const openAiKey = localStorage.getItem('vibe_key_openai');
    const groqKey = localStorage.getItem('vibe_key_groq');
    const localUrl = localStorage.getItem('vibe_local_url') || 'http://localhost:11434/v1';
    const localModel = localStorage.getItem('vibe_local_model') || 'llama3.2';
    const activeProvider = localStorage.getItem('vibe_ai_provider') || 'local';

    const systemPrompt = `You are an elite software architect explaining code to a vibe coder in simple, jargon-free English. File: ${file.path} (${file.pipelineRole || 'module'}). Code: \`\`\`${file.code.slice(0, 3000)}\`\`\``;

    // 1. Localhost AI (Ollama / LM Studio) or Cloud Providers (Groq / OpenAI)
    const targetUrl = activeProvider === 'local'
      ? `${localUrl.replace(/\/+$/, '')}/chat/completions`
      : groqKey
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : openAiKey
      ? 'https://api.openai.com/v1/chat/completions'
      : null;

    if (targetUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (groqKey && activeProvider === 'groq') headers.Authorization = `Bearer ${groqKey}`;
      if (openAiKey && activeProvider === 'openai') headers.Authorization = `Bearer ${openAiKey}`;

      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: activeProvider === 'local' ? localModel : groqKey ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: queryText }],
          }),
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
          setIsThinking(false);
          return;
        }
      } catch (e) {
        console.warn('AI endpoint error, falling back to deterministic engine', e);
      }
    }

    // 2. Deterministic Semantic Heuristic Engine (100% Offline & Free)
    setTimeout(() => {
      let reply = '';
      const low = queryText.toLowerCase();

      if (low.includes('interact') || low.includes('workflow') || low.includes('pipeline')) {
        const exp = file.flowExplanation;
        reply = `**Pipeline Role: ${file.pipelineRole?.toUpperCase() || 'MODULE'}**\n\n• **Inbound:** ${exp?.inbound || 'Receives data from parent callers.'}\n• **Processing:** ${exp?.processing || file.description}\n• **Outbound:** ${exp?.outbound || 'Passes results to downstream callers.'}`;
      } else if (low.includes('break') || low.includes('invariant') || low.includes('safe')) {
        reply = `**Critical Invariants for ${file.name}:**\n${file.blastRadius?.safeInvariants.map((i) => `• ${i}`).join('\n') || '• Keep function exports and route parameter names intact.'}\n\nTo edit in Claude Code or Antigravity, copy the CLI directive from the Safety tab!`;
      } else {
        reply = `**${file.name}** operates as **${file.pipelineRole || 'a component'}** in your application. It contains ${file.lineCount} lines and exposes ${file.exports.length} public declarations. Ask me about its inputs, outputs, or how it communicates with other files!`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setIsThinking(false);
    }, 400);
  }

  return (
    <div className="flex flex-col h-full bg-[#08090a]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 text-xs leading-relaxed ${
              m.role === 'assistant' ? 'bg-[#121316] p-3 rounded-xl border border-[#23252a]' : 'pl-2'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {m.role === 'assistant' ? (
                <div className="w-5 h-5 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-md bg-[#23252a] flex items-center justify-center text-[#d0d6e0]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="flex-1 text-[#f7f8f8] whitespace-pre-wrap font-sans">{m.content}</div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-[#8a8f98] p-3 bg-[#121316] rounded-xl border border-[#23252a]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5e6ad2]" />
            Analyzing code facts and invariants...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-3 border-t border-[#23252a] bg-[#010102]">
        <div className="flex items-center gap-2 bg-[#121316] border border-[#23252a] rounded-xl px-3 py-1.5 focus-within:border-[#5e6ad2]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion(input)}
            placeholder="Ask about pipeline flow, inputs, or invariants..."
            className="flex-1 bg-transparent text-xs text-[#f7f8f8] outline-none placeholder-[#62666d]"
          />
          <button
            onClick={() => handleAskQuestion(input)}
            disabled={!input.trim() || isThinking}
            className="p-1.5 text-white bg-[#5e6ad2] hover:bg-[#828fff] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
