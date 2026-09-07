import { Copy, Check, Clock } from 'lucide-react';
import { useState } from 'react';

export function RealGalleryFeed() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const items = [
    {
      id: 'g-1',
      title: 'Neon Koi Pond',
      model: 'Flux-1',
      time: '2m ago',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=60',
    },
    {
      id: 'g-2',
      title: 'Cyberpunk Skyline',
      model: 'SDXL',
      time: '14m ago',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=60',
    },
    {
      id: 'g-3',
      title: 'Astronaut Botanical Dome',
      model: 'Midjourney-v6',
      time: '1h ago',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=60',
    },
  ];

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-[11px] font-mono text-[#8a8f98] pb-1 border-b border-[#1c1d22]">
        <span>RECENT GENERATIONS</span>
        <span>{items.length} items</span>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div
            key={it.id}
            className="p-2 rounded-lg bg-[#121316] border border-[#23252a] flex items-center gap-3 hover:border-[#343842] transition-colors"
          >
            <img
              src={it.url}
              alt={it.title}
              className="w-11 h-11 rounded object-cover border border-[#23252a] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-medium text-[#f7f8f8] truncate">{it.title}</h5>
              <div className="flex items-center gap-2 text-[10px] text-[#8a8f98] font-mono mt-0.5">
                <span>{it.model}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {it.time}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setCopiedIdx(idx);
                setTimeout(() => setCopiedIdx(null), 1500);
              }}
              className="p-1.5 rounded text-[#8a8f98] hover:text-white bg-[#08090a] border border-[#23252a] shrink-0"
            >
              {copiedIdx === idx ? (
                <Check className="w-3 h-3 text-[#34d399]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
