import { useState } from 'react';
import { Sparkles, Send, Loader2, SlidersHorizontal } from 'lucide-react';

interface RealPromptBarProps {
  initialPrompt?: string;
  isInteractive?: boolean;
}

export function RealPromptBar({
  initialPrompt = 'A futuristic neon cyberpunk alleyway in Neo-Tokyo, rainy night reflections, 35mm lens, atmospheric volumetric fog',
  isInteractive = false,
}: RealPromptBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  const handleEnhance = () => {
    if (!isInteractive) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt((prev) => `${prev} --style raw --v 6.1 --cinematic-lighting`);
      setIsEnhancing(false);
    }, 600);
  };

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl p-3.5 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between text-[11px] font-mono text-[#8a8f98] pb-2 border-b border-[#1c1d22]">
        <span className="flex items-center gap-1.5 text-[#f7f8f8]">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#5e6ad2]" />
          Prompt Engine
        </span>
        <div className="flex items-center gap-1 bg-[#121316] p-0.5 rounded border border-[#23252a]">
          {(['1:1', '16:9', '9:16'] as const).map((a) => (
            <button
              key={a}
              onClick={() => isInteractive && setAspect(a)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                aspect === a ? 'bg-[#5e6ad2] text-white' : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => isInteractive && setPrompt(e.target.value)}
        readOnly={!isInteractive}
        rows={3}
        className="w-full bg-transparent text-xs resize-none outline-none text-[#f7f8f8] placeholder-[#62666d] leading-relaxed font-sans"
        placeholder="Enter your diffusion prompt..."
      />

      <div className="flex items-center justify-between pt-2 border-t border-[#1c1d22]">
        <button
          onClick={handleEnhance}
          disabled={isEnhancing}
          className="flex items-center gap-1.5 text-xs text-[#5e6ad2] hover:text-[#828fff] disabled:opacity-40 transition-colors cursor-pointer"
        >
          {isEnhancing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Vibe Enhance</span>
        </button>

        <button
          className="px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Generate</span>
        </button>
      </div>
    </div>
  );
}
