import { useState, useEffect } from 'react';
import { Key, X, Check, ShieldCheck } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'groq'>('openai');
  const [keyInput, setKeyInput] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`vibe_key_${provider}`) || '';
    setKeyInput(stored);
  }, [provider]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (keyInput.trim()) {
      localStorage.setItem(`vibe_key_${provider}`, keyInput.trim());
    } else {
      localStorage.removeItem(`vibe_key_${provider}`);
    }
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl max-w-md w-full p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-[#5e6ad2]">
          <Key className="w-5 h-5" />
          <h3 className="text-base font-semibold text-[#f7f8f8]">
            BYO-API Key (Optional)
          </h3>
        </div>

        <p className="text-xs text-[#8a8f98] leading-relaxed mb-4">
          All core visual graphs and mental models work 100% offline out-of-the-box. Add your own key for line-by-line streaming deep dives and instant custom refactors.
        </p>

        {/* Provider Selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['openai', 'anthropic', 'groq'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`py-1.5 px-3 rounded-lg text-xs font-mono capitalize border transition-all ${
                provider === p
                  ? 'bg-[#121316] border-[#5e6ad2] text-white shadow-sm'
                  : 'border-[#23252a] text-[#8a8f98] hover:bg-[#121316]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-2 mb-4">
          <label className="text-xs font-mono text-[#d0d6e0]">
            {provider.toUpperCase()} API Key
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={`sk-...`}
            className="w-full bg-[#121316] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] outline-none focus:border-[#5e6ad2] font-mono"
          />
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-[#121316] border border-[#23252a] rounded-lg text-[11px] text-[#8a8f98] mb-5">
          <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0" />
          <span>Keys are stored strictly in your browser's local storage and never leave your machine.</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-[#8a8f98] hover:text-white rounded-lg hover:bg-[#121316]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {savedStatus ? <Check className="w-3.5 h-3.5" /> : null}
            {savedStatus ? 'Saved' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
