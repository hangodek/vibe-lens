import { ShoppingBag, X, Trash2, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function RealCartDrawer() {
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'Retro High OG Neon',
      size: '10',
      price: 180,
      image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=200&auto=format&fit=crop&q=60',
    },
    {
      id: 2,
      name: 'Cyber Runner 3000',
      size: '10.5',
      price: 210,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=60',
    },
  ]);

  const subtotal = items.reduce((a, b) => a + b.price, 0);

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl p-4 flex flex-col gap-3 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#5e6ad2]" />
          <h4 className="text-xs font-semibold text-[#f7f8f8]">Shopping Cart</h4>
        </div>
        <span className="text-[10px] font-mono text-[#8a8f98] bg-[#121316] px-2 py-0.5 rounded">
          {items.length} items
        </span>
      </div>

      {/* Item List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {items.map((it) => (
          <div
            key={it.id}
            className="p-2 rounded-lg bg-[#121316] border border-[#23252a] flex items-center gap-3"
          >
            <img
              src={it.image}
              alt={it.name}
              className="w-12 h-12 rounded object-cover border border-[#23252a]"
            />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-medium text-[#f7f8f8] truncate">{it.name}</h5>
              <p className="text-[10px] font-mono text-[#8a8f98] mt-0.5">Size {it.size}</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#34d399]">${it.price}</span>
            <button
              onClick={() => setItems(items.filter((x) => x.id !== it.id))}
              className="p-1 text-[#8a8f98] hover:text-[#ef4444] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Checkout Footer */}
      <div className="pt-3 border-t border-[#23252a] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#8a8f98]">Subtotal:</span>
          <span className="text-base font-bold text-[#f7f8f8]">${subtotal}</span>
        </div>
        <button className="w-full py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm">
          <span>Proceed to Checkout</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
