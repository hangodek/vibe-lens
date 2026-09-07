import { Download, Sparkles, Layers, Maximize } from 'lucide-react';

interface RealCanvasViewerProps {
  isGenerating?: boolean;
  isInteractive?: boolean;
}

export function RealCanvasViewer({
  isGenerating = false,
  isInteractive = false,
}: RealCanvasViewerProps) {
  if (isGenerating) {
    return (
      <div className="w-full h-72 bg-[#08090a] border border-[#23252a] rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5e6ad2]/15 to-transparent animate-pulse" />
        <div className="p-3 rounded-full bg-[#121316] border border-[#5e6ad2]/50 text-[#828fff] mb-3 animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-[#f7f8f8]">Synthesizing diffusion latent space...</p>
        <p className="text-[10px] font-mono text-[#8a8f98] mt-1">Denoising Step 21 / 28 (75%)</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72 bg-[#08090a] border border-[#23252a] rounded-xl relative overflow-hidden flex items-center justify-center group shadow-2xl">
      {/* High-res rendered photo output */}
      <img
        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"
        alt="Rendered Art"
        className="w-full h-full object-cover rounded-lg"
      />

      {/* Floating Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#08090a]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#23252a] text-[10px] font-mono text-[#f7f8f8]">
        <Layers className="w-3 h-3 text-[#5e6ad2]" />
        <span>Flux Schnell · 1024×1024</span>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-[#08090a]/85 backdrop-blur-md px-3 py-2 rounded-lg border border-[#23252a]">
        <span className="text-xs text-[#d0d6e0] truncate max-w-[280px]">
          Cyberpunk alleyway, neon volumetric reflections
        </span>
        <div className="flex items-center gap-1.5">
          <button className="p-1.5 rounded text-[#8a8f98] hover:text-white hover:bg-[#1c1d22] transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded text-[#8a8f98] hover:text-white hover:bg-[#1c1d22] transition-colors">
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
