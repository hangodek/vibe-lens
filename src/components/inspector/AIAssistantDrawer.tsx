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
      content: `I am your Vibe Architecture Assistant. Ask me anything about **${file.name}**, its hidden re-renders, or what will happen if you ask Cursor to modify it.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-fill and submit if initial question is passed
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

    const userMsg: Message = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Check for user API key
    const openAiKey = localStorage.getItem('vibe_key_openai');

    if (openAiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an elite software architect explaining code to a vibe coder in simple, jargon-free English. File: ${file.path}. Code: \`\`\`${file.code}\`\`\``,
              },
              { role: 'user', content: queryText },
            ],
          }),
        });
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || 'Failed to parse response.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        setIsThinking(false);
        return;
      } catch (e) {
        console.warn('API error, falling back to heuristics engine', e);
      }
    }

    // Heuristic Smart Explainer Fallback (No Key Needed)
    setTimeout(() => {
      let smartAnswer = '';
      const lower = queryText.toLowerCase();

      if (lower.includes('interact') || lower.includes('other')) {
        smartAnswer = `**${file.name}** connects to downstream components like **${file.renderedChildren.join(', ') || 'its container'}**. When events fire, state flows via props. Any parent holding this component will trigger a reconciliation pass whenever props mutate.`;
      } else if (lower.includes('break') || lower.includes('state')) {
        smartAnswer = `If you rename or remove \`${file.states[0]?.name || 'state'}\`, any handler expecting \`${file.states[0]?.setter || 'setter'}\` will throw undefined. Always tell Cursor: *"Keep existing state variable signatures intact while updating UI"*.`;
      } else {
        smartAnswer = `**${file.name}** is a **${file.type}** with ${file.lineCount} lines. It imports ${file.imports.length} modules and defines ${file.states.length} reactive state variables. To customize it safely, ask your AI to modify the JSX without altering the exported function names.`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: smartAnswer }]);
      setIsThinking(false);
    }, 600);
  }

  return (
    <div className="flex flex-col h-full bg-[#08090a]">
      {/* Messages Feed */}
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
            <div className="flex-1 text-[#f7f8f8] whitespace-pre-wrap">
              {m.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-[#8a8f98] p-3 bg-[#121316] rounded-xl border border-[#23252a]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5e6ad2]" />
            Analyzing component architecture...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Query Input Bar */}
      <div className="p-3 border-t border-[#23252a] bg-[#010102]">
        <div className="flex items-center gap-2 bg-[#121316] border border-[#23252a] rounded-xl px-3 py-1.5 focus-within:border-[#5e6ad2]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion(input)}
            placeholder="Ask about this file..."
            className="flex-1 bg-transparent text-xs text-[#f7f8f8] outline-none placeholder-[#62666d]"
          />
          <button
            onClick={() => handleAskQuestion(input)}
            disabled={!input.trim() || isThinking}
            className="p-1.5 text-white bg-[#5e6ad2] hover:bg-[#828fff] disabled:opacity-40 rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
