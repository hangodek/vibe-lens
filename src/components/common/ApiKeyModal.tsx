import { useState, useEffect } from 'react';
import { Key, X, Check, ShieldCheck, Cpu } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [provider, setProvider] = useState<'local' | 'openai' | 'anthropic' | 'groq'>('local');
  const [keyInput, setKeyInput] = useState('');
  const [localUrl, setLocalUrl] = useState('http://localhost:11434/v1');
  const [localModel, setLocalModel] = useState('llama3.2');
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    if (provider === 'local') {
      setLocalUrl(localStorage.getItem('vibe_local_url') || 'http://localhost:11434/v1');
      setLocalModel(localStorage.getItem('vibe_local_model') || 'llama3.2');
    } else {
      const stored = localStorage.getItem(`vibe_key_${provider}`) || '';
      setKeyInput(stored);
    }
  }, [provider]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (provider === 'local') {
      localStorage.setItem('vibe_local_url', localUrl.trim() || 'http://localhost:11434/v1');
      localStorage.setItem('vibe_local_model', localModel.trim() || 'llama3.2');
      localStorage.setItem('vibe_ai_provider', 'local');
    } else {
      if (keyInput.trim()) {
        localStorage.setItem(`vibe_key_${provider}`, keyInput.trim());
        localStorage.setItem('vibe_ai_provider', provider);
      } else {
        localStorage.removeItem(`vibe_key_${provider}`);
      }
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
          className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-[#5e6ad2]">
          <Key className="w-5 h-5" />
          <h3 className="text-base font-semibold text-[#f7f8f8]">
            AI Engine Configuration
          </h3>
        </div>

        <p className="text-xs text-[#8a8f98] leading-relaxed mb-4">
          All core visual graphs and mental models work 100% offline. Enable Localhost AI (Ollama) or add a cloud key for streaming code explanations.
        </p>

        {/* Provider Selector */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {[
            { id: 'local', label: 'Localhost AI' },
            { id: 'openai', label: 'OpenAI' },
            { id: 'anthropic', label: 'Anthropic' },
            { id: 'groq', label: 'Groq (Fast)' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id as any)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all cursor-pointer truncate ${
                provider === p.id
                  ? 'bg-[#121316] border-[#5e6ad2] text-white shadow-sm font-semibold'
                  : 'border-[#23252a] text-[#8a8f98] hover:bg-[#121316]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {provider === 'local' ? (
          <div className="space-y-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#d0d6e0] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#34d399]" />
                Localhost Endpoint (Ollama / LM Studio)
              </label>
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="w-full bg-[#121316] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] outline-none focus:border-[#5e6ad2] font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#8a8f98]">Local Model Tag</label>
              <input
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                placeholder="llama3.2"
                className="w-full bg-[#121316] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] outline-none focus:border-[#5e6ad2] font-mono"
              />
            </div>
          </div>
        ) : (
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
        )}

        <div className="flex items-center gap-2 p-2.5 bg-[#121316] border border-[#23252a] rounded-lg text-[11px] text-[#8a8f98] mb-5">
          <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0" />
          <span>Stored exclusively in your local browser storage. Never uploaded anywhere.</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-[#8a8f98] hover:text-white rounded-lg hover:bg-[#121316] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {savedStatus ? <Check className="w-3.5 h-3.5" /> : null}
            {savedStatus ? 'Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
