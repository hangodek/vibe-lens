import { useState } from 'react';
import type { ParsedCodeFile } from '../../types/ast';
import { RealPromptBar } from '../real-previews/RealPromptBar';
import { RealCanvasViewer } from '../real-previews/RealCanvasViewer';
import { RealGalleryFeed } from '../real-previews/RealGalleryFeed';
import { RealUsageMeter } from '../real-previews/RealUsageMeter';
import { RealBillingModal } from '../real-previews/RealBillingModal';
import { RealProductCard } from '../real-previews/RealProductCard';
import { RealCartDrawer } from '../real-previews/RealCartDrawer';
import { RealApiTerminal } from '../real-previews/RealApiTerminal';
import { Monitor, Tablet, Smartphone, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LiveSandboxTabProps {
  file: ParsedCodeFile;
}

export function LiveSandboxTab({ file }: LiveSandboxTabProps) {
  const [viewportWidth, setViewportWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const type = file.previewType;

  // Responsive risk calculation
  const hasMobileOverflowRisk = type === 'billing-modal' || type === 'canvas';

  const containerWidthClass =
    viewportWidth === 'desktop'
      ? 'w-full'
      : viewportWidth === 'tablet'
      ? 'w-[320px]'
      : 'w-[260px]';

  return (
    <div className="p-4 space-y-4">
      {/* Viewport Width Tester Toolbar */}
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-2.5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-[#8a8f98] uppercase">
          Viewport Tester
        </span>
        <div className="flex items-center gap-1 bg-[#121316] p-1 rounded-lg border border-[#23252a]">
          <button
            onClick={() => setViewportWidth('desktop')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewportWidth === 'desktop' ? 'bg-[#1c1d22] text-white shadow-xs' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setViewportWidth('tablet')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewportWidth === 'tablet' ? 'bg-[#1c1d22] text-white shadow-xs' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>
          <button
            onClick={() => setViewportWidth('mobile')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewportWidth === 'mobile' ? 'bg-[#1c1d22] text-white shadow-xs' : 'text-[#8a8f98] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Responsive Diagnostic Notice */}
      {viewportWidth === 'mobile' && hasMobileOverflowRisk ? (
        <div className="p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-start gap-2.5 text-xs text-[#fbbf24]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-white">Responsiveness Notice:</strong> Multi-column grid wraps tight on 375px mobile viewports. Tell your AI: <code className="bg-[#08090a] px-1 py-0.5 rounded text-[#f7f8f8]">"Stack columns vertically on mobile (grid-cols-1 md:grid-cols-2)"</code>.
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center gap-2 text-xs text-[#34d399]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Interactive Live Sandbox active · Click and test inputs below</span>
        </div>
      )}

      {/* Interactive Render Sandbox */}
      <div className="w-full flex justify-center bg-[#050608] border border-[#23252a] rounded-2xl p-4 overflow-x-auto min-h-[300px]">
        <div className={`transition-all duration-300 ${containerWidthClass}`}>
          {type === 'prompt-bar' && <RealPromptBar isInteractive />}
          {type === 'canvas' && <RealCanvasViewer isInteractive />}
          {type === 'gallery' && <RealGalleryFeed />}
          {type === 'meter' && <RealUsageMeter isInteractive />}
          {type === 'billing-modal' && <RealBillingModal />}
          {type === 'product-card' && <RealProductCard isInteractive />}
          {type === 'cart-drawer' && <RealCartDrawer />}
          {type === 'api-terminal' && <RealApiTerminal />}
          {(!type || type === 'generic') && (
            <div className="p-6 bg-[#08090a] border border-[#23252a] rounded-xl text-center text-[#8a8f98]">
              <Sparkles className="w-8 h-8 mx-auto text-[#5e6ad2] mb-2" />
              <h5 className="text-xs font-semibold text-white">Custom Component Sandbox</h5>
              <p className="text-[11px] text-[#62666d] mt-1">
                Visual preview dynamically bound to incoming state and properties.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
