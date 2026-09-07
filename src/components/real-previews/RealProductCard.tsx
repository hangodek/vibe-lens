import { useState } from 'react';
import { ShoppingBag, Star, Check } from 'lucide-react';

interface RealProductCardProps {
  isInteractive?: boolean;
}

export function RealProductCard({ isInteractive = false }: RealProductCardProps) {
  const [selectedSize, setSelectedSize] = useState('10');
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!isInteractive) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden p-3.5 flex flex-col gap-3 shadow-xl">
      {/* Sneaker Image Frame */}
      <div className="w-full h-44 rounded-lg overflow-hidden relative bg-[#121316] border border-[#23252a]">
        <img
          src="https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80"
          alt="Retro High OG Neon"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2.5 left-2.5 bg-[#010102]/80 backdrop-blur-md text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#23252a] text-[#f7f8f8]">
          Limited Drop
        </span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#f7f8f8]">Retro High OG Neon</h4>
          <div className="flex items-center gap-1 mt-0.5 text-[#fbbf24] text-[10px]">
            <Star className="w-3 h-3 fill-current" />
            <span className="font-mono text-[#f7f8f8]">4.9</span>
            <span className="text-[#8a8f98] font-mono">(142)</span>
          </div>
        </div>
        <span className="text-sm font-bold font-mono text-[#34d399] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20">
          $180
        </span>
      </div>

      {/* Size Picker Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Select US Size</span>
        <div className="flex gap-1.5">
          {['9', '9.5', '10', '10.5', '11'].map((s) => (
            <button
              key={s}
              onClick={() => isInteractive && setSelectedSize(s)}
              className={`flex-1 py-1 text-xs font-mono rounded-md border transition-all cursor-pointer ${
                selectedSize === s
                  ? 'bg-[#5e6ad2] border-[#5e6ad2] text-white font-bold shadow-xs'
                  : 'bg-[#121316] border-[#23252a] text-[#8a8f98] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Add to Cart CTA */}
      <button
        onClick={handleAdd}
        className="w-full py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
      >
        {added ? <Check className="w-3.5 h-3.5 text-white" /> : <ShoppingBag className="w-3.5 h-3.5" />}
        <span>{added ? 'Added to Cart!' : `Add to Cart (Size ${selectedSize})`}</span>
      </button>
    </div>
  );
}
