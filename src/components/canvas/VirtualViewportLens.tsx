import type { MiniPreviewType } from '../../types/ast';
import { RealPromptBar } from '../real-previews/RealPromptBar';
import { RealCanvasViewer } from '../real-previews/RealCanvasViewer';
import { RealGalleryFeed } from '../real-previews/RealGalleryFeed';
import { RealUsageMeter } from '../real-previews/RealUsageMeter';
import { RealBillingModal } from '../real-previews/RealBillingModal';
import { RealProductCard } from '../real-previews/RealProductCard';
import { RealCartDrawer } from '../real-previews/RealCartDrawer';
import { RealApiTerminal } from '../real-previews/RealApiTerminal';

interface VirtualViewportLensProps {
  previewType?: MiniPreviewType;
}

export function VirtualViewportLens({ previewType }: VirtualViewportLensProps) {
  // Virtual frame size: Desktop standard 560px wide
  // Scaled down by 0.44 into a ~250px container with 105px height fold
  return (
    <div className="w-full h-[105px] rounded-lg bg-[#050608] border border-[#23252a] overflow-hidden relative select-none">
      {/* Scaled Desktop Camera Lens Stage */}
      <div
        className="origin-top-left pointer-events-none"
        style={{
          width: '560px',
          transform: 'scale(0.44)',
        }}
      >
        {previewType === 'prompt-bar' && <RealPromptBar />}
        {previewType === 'canvas' && <RealCanvasViewer />}
        {previewType === 'gallery' && <RealGalleryFeed />}
        {previewType === 'meter' && <RealUsageMeter />}
        {previewType === 'billing-modal' && <RealBillingModal />}
        {previewType === 'product-card' && <RealProductCard />}
        {previewType === 'cart-drawer' && <RealCartDrawer />}
        {previewType === 'api-terminal' && <RealApiTerminal />}
        {(!previewType || previewType === 'generic') && (
          <div className="p-4 bg-[#08090a] border border-[#23252a] rounded-xl text-xs font-mono text-[#8a8f98]">
            <div className="h-4 w-40 bg-[#1c1d22] rounded mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-[#121316] rounded" />
              <div className="h-3 w-3/4 bg-[#121316] rounded" />
              <div className="h-3 w-1/2 bg-[#121316] rounded" />
            </div>
          </div>
        )}
      </div>

      {/* Top Fold Bottom Gradient Fade (Prevents layout butchering on big components) */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#08090a] via-[#08090a]/70 to-transparent pointer-events-none flex items-end justify-center pb-0.5">
        <span className="text-[8px] font-mono text-[#62666d] uppercase tracking-wider">
          Top-Fold Lens · Scaled
        </span>
      </div>
    </div>
  );
}
