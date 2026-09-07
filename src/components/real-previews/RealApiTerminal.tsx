import { Terminal, CheckCircle2, ShieldCheck } from 'lucide-react';

interface RealApiTerminalProps {
  endpoint?: string;
}

export function RealApiTerminal({ endpoint = '/api/generate' }: RealApiTerminalProps) {
  return (
    <div className="w-full bg-[#050608] border border-[#23252a] rounded-xl p-3 font-mono flex flex-col gap-2 shadow-2xl">
      <div className="flex items-center justify-between text-[10px] pb-2 border-b border-[#1c1d22]">
        <div className="flex items-center gap-1.5 text-[#34d399]">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-bold">POST {endpoint}</span>
        </div>
        <span className="text-[#34d399] bg-[#10b981]/15 px-1.5 py-0.5 rounded text-[9px] font-bold">
          200 OK (210ms)
        </span>
      </div>

      <div className="text-[10px] text-[#8a8f98] space-y-1">
        <div>
          <span className="text-[#828fff]">Headers:</span> Authorization: Bearer &bull;&bull;&bull;&bull;&bull;&bull;
        </div>
        <div>
          <span className="text-[#828fff]">Payload:</span> &#123; prompt: "cyberpunk", aspect: "1:1" &#125;
        </div>
        <div className="text-[#34d399]">
          <span className="text-[#828fff]">Response:</span> &#123; id: "art-91", status: "success" &#125;
        </div>
      </div>
    </div>
  );
}
