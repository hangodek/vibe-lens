import { useState } from 'react';
import type { ParsedCodeFile, VibeProject } from '../../types/ast';
import { RealPromptBar } from '../real-previews/RealPromptBar';
import { RealCanvasViewer } from '../real-previews/RealCanvasViewer';
import { RealGalleryFeed } from '../real-previews/RealGalleryFeed';
import { RealUsageMeter } from '../real-previews/RealUsageMeter';
import { RealBillingModal } from '../real-previews/RealBillingModal';
import { RealProductCard } from '../real-previews/RealProductCard';
import { RealCartDrawer } from '../real-previews/RealCartDrawer';
import { X, Monitor, Smartphone, MapPin, Eye } from 'lucide-react';

interface ScreenLocatorModalProps {
  isOpen: boolean;
  file: ParsedCodeFile | null;
  project: VibeProject;
  onClose: () => void;
}

export function ScreenLocatorModal({
  isOpen,
  file,
  project,
  onClose,
}: ScreenLocatorModalProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen || !file) return null;

  const loc = file.screenLocation || {
    xPercent: 10,
    yPercent: 15,
    widthPercent: 80,
    heightPercent: 70,
    zoneLabel: 'General Application Body'
  };

  const isNonVisual = loc.widthPercent === 0 || file.type === 'hook' || file.type === 'api' || file.type === 'store';
  const type = file.previewType;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#08090a] border border-[#23252a] rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-14 px-6 border-b border-[#23252a] bg-[#010102] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 flex items-center justify-center text-[#828fff]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-2">
                <span>Real Screen Locator</span>
                <span className="text-[10px] font-mono text-[#8a8f98] bg-[#121316] px-2 py-0.5 rounded border border-[#23252a]">
                  {file.name}
                </span>
              </h3>
              <p className="text-[11px] text-[#8a8f98]">
                {isNonVisual
                  ? 'Background system (runs behind the screen, no direct pixels)'
                  : `Highlighting exact screen coordinates: ${loc.zoneLabel}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#121316] border border-[#23252a] rounded-lg p-1">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  device === 'desktop' ? 'bg-[#1c1d22] text-white shadow-xs' : 'text-[#8a8f98] hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  device === 'mobile' ? 'bg-[#1c1d22] text-white shadow-xs' : 'text-[#8a8f98] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#8a8f98] hover:text-white hover:bg-[#121316] rounded-lg transition-colors cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real Application Screen Stage */}
        <div className="flex-1 bg-[#010102] p-6 flex items-center justify-center overflow-auto relative">
          <div
            className={`border border-[#23252a] rounded-xl bg-[#08090a] shadow-2xl relative transition-all duration-300 flex flex-col overflow-hidden ${
              device === 'desktop' ? 'w-full max-w-4xl h-[560px]' : 'w-[375px] h-[560px]'
            }`}
          >
            {/* Simulated Browser Chrome */}
            <div className="h-8 bg-[#121316] border-b border-[#23252a] px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]/60" />
              </div>
              <div className="bg-[#08090a] border border-[#23252a] rounded px-3 py-0.5 text-[10px] font-mono text-[#8a8f98] w-64 text-center truncate">
                localhost:3000/{project.id}
              </div>
              <div className="w-8" />
            </div>

            {/* Real Application Viewport */}
            <div className="flex-1 p-4 relative bg-[#050608] overflow-y-auto">
              {project.id === 'ai-studio' && (
                <div className="space-y-4">
                  <header className="h-12 border-b border-[#23252a] px-3 flex items-center justify-between bg-[#08090a] rounded-lg">
                    <span className="text-xs font-bold text-white">DreamCanvas Studio</span>
                    <span className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad2]/15 px-2 py-0.5 rounded">Flux-Dev Active</span>
                  </header>

                  <div className={`grid ${device === 'desktop' ? 'grid-cols-12 gap-4' : 'grid-cols-1 gap-4'}`}>
                    <div className={device === 'desktop' ? 'col-span-8 space-y-4' : 'space-y-4'}>
                      <div className={`transition-all ${type === 'canvas' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                        <RealCanvasViewer />
                      </div>
                      <div className={`transition-all ${type === 'prompt-bar' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                        <RealPromptBar />
                      </div>
                    </div>

                    <div className={device === 'desktop' ? 'col-span-4' : ''}>
                      <div className={`transition-all ${type === 'gallery' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                        <RealGalleryFeed />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {project.id === 'saas-billing' && (
                <div className="space-y-4">
                  <header className="h-12 border-b border-[#23252a] px-3 flex items-center justify-between bg-[#08090a] rounded-lg">
                    <span className="text-xs font-bold text-white">OpsMetric Dashboard</span>
                    <span className="text-[10px] font-mono text-[#34d399] bg-[#10b981]/15 px-2 py-0.5 rounded">Cluster Healthy</span>
                  </header>
                  <div className={`transition-all ${type === 'meter' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                    <RealUsageMeter />
                  </div>
                  <div className={`transition-all ${type === 'billing-modal' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                    <RealBillingModal />
                  </div>
                </div>
              )}

              {project.id === 'ecommerce-cart' && (
                <div className="space-y-4">
                  <header className="h-12 border-b border-[#23252a] px-3 flex items-center justify-between bg-[#08090a] rounded-lg">
                    <span className="text-xs font-bold text-white tracking-wider">KICKS DROP</span>
                    <span className="text-[10px] font-mono text-[#828fff]">Cart (1)</span>
                  </header>
                  <div className={`grid ${device === 'desktop' ? 'grid-cols-2 gap-4' : 'grid-cols-1 gap-4'}`}>
                    <div className={`transition-all ${type === 'product-card' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                      <RealProductCard />
                    </div>
                    <div className={`transition-all ${type === 'cart-drawer' ? 'ring-2 ring-[#5e6ad2] shadow-[0_0_24px_rgba(94,106,210,0.6)] rounded-xl' : 'opacity-80'}`}>
                      <RealCartDrawer />
                    </div>
                  </div>
                </div>
              )}

              {/* Non-visual logic banner */}
              {isNonVisual && (
                <div className="absolute inset-0 bg-[#08090a]/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                  <div className="p-3 rounded-full bg-[#1c1d22] border border-[#343842] mb-3 text-[#828fff]">
                    <Eye className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Invisible Background Logic</h4>
                  <p className="text-xs text-[#8a8f98] max-w-sm mt-1">
                    This file (`{file.name}`) runs state, hooks, or backend server queries. It coordinates the visible components on this screen without rendering direct DOM pixels.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
