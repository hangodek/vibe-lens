import type { MiniPreviewType } from '../../types/ast';
import { Send, Image, Sparkles, Terminal, ShoppingBag, ShieldAlert } from 'lucide-react';

interface NodeMiniPreviewProps {
  previewType?: MiniPreviewType;
}

export function NodeMiniPreview({ previewType }: NodeMiniPreviewProps) {
  if (previewType === 'prompt-bar') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-2 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#343842]" />
          <div className="h-2 w-32 bg-[#1c1d22] rounded-xs" />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#1a1b1f]">
          <span className="text-[9px] font-mono text-[#5e6ad2] flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Enhance
          </span>
          <div className="px-2 py-0.5 bg-[#5e6ad2] text-white rounded text-[9px] flex items-center gap-1 font-medium shadow-xs">
            <Send className="w-2 h-2" /> Gen
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'canvas') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5e6ad2]/10 to-transparent animate-pulse" />
        <div className="flex items-center gap-2 z-10">
          <Image className="w-4 h-4 text-[#828fff]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-[#f7f8f8]">Diffusion Viewport</span>
            <span className="text-[8px] font-mono text-[#8a8f98]">1:1 · Aspect Locked</span>
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'gallery') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-1.5 flex gap-1.5 overflow-hidden">
        <div className="w-10 h-full bg-[#121316] rounded border border-[#23252a] flex items-center justify-center shrink-0">
          <div className="w-5 h-5 rounded bg-[#5e6ad2]/20" />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="h-2 w-16 bg-[#23252a] rounded-xs" />
          <div className="h-1.5 w-10 bg-[#1c1d22] rounded-xs" />
        </div>
      </div>
    );
  }

  if (previewType === 'meter') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-2 flex flex-col justify-between">
        <div className="flex justify-between items-center text-[9px] font-mono">
          <span className="text-[#8a8f98]">QUOTA</span>
          <span className="text-[#f59e0b]">84% Full</span>
        </div>
        <div className="w-full h-2 bg-[#1c1d22] rounded-full overflow-hidden">
          <div className="h-full bg-[#5e6ad2] w-[84%]" />
        </div>
      </div>
    );
  }

  if (previewType === 'billing-modal') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-1.5 flex gap-1.5 items-center justify-center">
        <div className="w-16 h-10 rounded border border-[#23252a] bg-[#121316] p-1 flex flex-col justify-between">
          <span className="text-[8px] font-mono text-[#8a8f98]">$0/mo</span>
        </div>
        <div className="w-16 h-10 rounded border border-[#5e6ad2] bg-[#121316] p-1 flex flex-col justify-between">
          <span className="text-[8px] font-mono text-[#828fff] font-bold">$29/mo</span>
        </div>
      </div>
    );
  }

  if (previewType === 'product-card') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-1.5 flex gap-2 items-center">
        <div className="w-10 h-10 rounded bg-[#1c1d22] border border-[#23252a] flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 text-[#828fff]" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="h-2 w-14 bg-[#23252a] rounded-xs" />
            <span className="text-[9px] font-mono text-[#34d399] font-bold">$180</span>
          </div>
          <div className="flex gap-1">
            <span className="text-[7px] font-mono px-1 rounded bg-[#5e6ad2] text-white">10</span>
            <span className="text-[7px] font-mono px-1 rounded bg-[#121316] text-[#8a8f98]">11</span>
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'cart-drawer') {
    return (
      <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-2 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-[#f7f8f8]">Cart Slideout</span>
          <span className="text-[8px] font-mono text-[#8a8f98]">1 item · $180</span>
        </div>
        <div className="px-2 py-1 bg-[#5e6ad2] text-white rounded text-[9px] font-mono font-medium">
          Checkout
        </div>
      </div>
    );
  }

  if (previewType === 'api-terminal') {
    return (
      <div className="w-full h-14 bg-[#050608] border border-[#23252a] rounded-lg p-2 font-mono flex flex-col justify-between">
        <div className="flex items-center gap-1 text-[9px] text-[#34d399]">
          <Terminal className="w-2.5 h-2.5" />
          <span>POST 200 OK</span>
        </div>
        <div className="text-[8px] text-[#62666d] truncate">
          &#123; status: 'completed', seed: 42 &#125;
        </div>
      </div>
    );
  }

  // Generic Code Wireframe Fallback
  return (
    <div className="w-full h-14 bg-[#08090a] border border-[#23252a] rounded-lg p-2 flex flex-col justify-center gap-1.5">
      <div className="h-1.5 w-24 bg-[#1c1d22] rounded-xs" />
      <div className="h-1.5 w-36 bg-[#16171b] rounded-xs" />
      <div className="h-1.5 w-16 bg-[#1c1d22] rounded-xs" />
    </div>
  );
}
