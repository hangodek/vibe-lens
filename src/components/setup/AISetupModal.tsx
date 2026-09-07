import { useState, useEffect } from 'react';
import { Terminal, Key, X, Check, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { checkCompanionHealth } from '../../utils/aiClient';

interface AISetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AISetupModal({ isOpen, onClose, onSaved }: AISetupModalProps) {
  const [activeTab, setActiveTab] = useState<'cli' | 'cloud'>('cli');
  const [selectedTool, setSelectedTool] = useState<'agy' | 'opencode' | 'claude'>('claude');
  const [cloudProvider, setCloudProvider] = useState<'openai' | 'anthropic' | 'groq' | 'gemini'>('groq');
  const [cloudKey, setCloudKey] = useState('');
  const [companionStatus, setCompanionStatus] = useState<{
    online: boolean;
    tools: { agy: boolean; opencode: boolean; claude: boolean; ollama: boolean };
  }>({ online: false, tools: { agy: false, opencode: false, claude: false, ollama: false } });
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    checkCompanionHealth().then(setCompanionStatus);

    const storedProvider = localStorage.getItem('vibe_ai_provider') || 'local_cli';
    if (storedProvider === 'local_cli') {
      setActiveTab('cli');
      setSelectedTool((localStorage.getItem('vibe_cli_tool') as any) || 'opencode');
    } else {
      setActiveTab('cloud');
      setCloudProvider(storedProvider as any);
      setCloudKey(localStorage.getItem(`vibe_key_${storedProvider}`) || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (activeTab === 'cli') {
      localStorage.setItem('vibe_ai_provider', 'local_cli');
      localStorage.setItem('vibe_cli_tool', selectedTool);
    } else {
      localStorage.setItem('vibe_ai_provider', cloudProvider);
      if (cloudKey.trim()) {
        localStorage.setItem(`vibe_key_${cloudProvider}`, cloudKey.trim());
      }
    }
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      if (onSaved) onSaved();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl max-w-lg w-full p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-[#5e6ad2]">
          <Terminal className="w-5 h-5 text-[#828fff]" />
          <h3 className="text-base font-semibold text-[#f7f8f8]">AI Engine Configuration</h3>
        </div>

        <p className="text-xs text-[#8a8f98] leading-relaxed mb-4">
          Connect your local CLI agents (agy, opencode, claude) or cloud API keys so AI scans and deeply understands your projects.
        </p>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#121316] border border-[#23252a] rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('cli')}
            className={`py-2 text-xs font-mono rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'cli' ? 'bg-[#23252a] text-[#f7f8f8] font-semibold' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#34d399]" />
            Local CLI Agents
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2 text-xs font-mono rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'cloud' ? 'bg-[#23252a] text-[#f7f8f8] font-semibold' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[#828fff]" />
            Cloud API Keys
          </button>
        </div>

        {activeTab === 'cli' ? (
          <div className="space-y-3 mb-4">
            <div className="p-3 bg-[#121316] border border-[#23252a] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-[#8a8f98]">AI Engine Bridge:</span>
                <span className="flex items-center gap-1.5 text-xs font-mono">
                  <span className={`w-2 h-2 rounded-full ${companionStatus.online ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
                  <span className={companionStatus.online ? 'text-[#34d399]' : 'text-[#f87171]'}>
                    {companionStatus.online ? 'Active (Native Vite Server)' : 'Offline'}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-[#62666d]">
                Zero-setup local CLI bridge. Automatically uses whichever tool is ready on your system.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-[#d0d6e0]">Select Active CLI Agent</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'opencode', label: 'opencode', name: 'OpenCode CLI (Company Default)' },
                  { id: 'agy', label: 'agy', name: 'Antigravity CLI' },
                  { id: 'claude', label: 'claude', name: 'Claude Code' },
                ].map((t) => {
                  const detected = companionStatus.tools[t.id as keyof typeof companionStatus.tools];
                  const isSelected = selectedTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTool(t.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#5e6ad2] bg-[#1a1c23]'
                          : 'border-[#23252a] bg-[#121316] hover:border-[#383a42]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-semibold text-[#f7f8f8]">{t.label}</span>
                        {detected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-[#e5a000]" />
                        )}
                      </div>
                      <div className="text-[10px] text-[#8a8f98]">{detected ? 'Detected on PATH' : 'Not detected'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'groq', label: 'Groq (Fast)' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'gemini', label: 'Gemini' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCloudProvider(p.id as any);
                    setCloudKey(localStorage.getItem(`vibe_key_${p.id}`) || '');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all cursor-pointer truncate ${
                    cloudProvider === p.id
                      ? 'bg-[#121316] border-[#5e6ad2] text-white font-semibold'
                      : 'border-[#23252a] text-[#8a8f98] hover:bg-[#121316]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#d0d6e0]">{cloudProvider.toUpperCase()} API Key</label>
              <input
                type="password"
                value={cloudKey}
                onChange={(e) => setCloudKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#121316] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] outline-none focus:border-[#5e6ad2] font-mono"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-2.5 bg-[#121316] border border-[#23252a] rounded-lg text-[11px] text-[#8a8f98] mb-5">
          <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0" />
          <span>Config stored locally in your browser. Companion server connects securely over localhost.</span>
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
            {savedStatus ? 'Saved' : 'Save AI Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
