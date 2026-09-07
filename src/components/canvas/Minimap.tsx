import type { CanvasNode, ViewportState } from '../../types/graph';

interface MinimapProps {
  nodes: CanvasNode[];
  viewport: ViewportState;
  selectedFileId: string | null;
}

export function Minimap({ nodes, viewport, selectedFileId }: MinimapProps) {
  const MAP_WIDTH = 180;
  const MAP_HEIGHT = 110;

  // Find canvas bounding box
  let minX = 0;
  let maxX = 1200;
  let minY = 0;
  let maxY = 800;

  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  const rangeX = Math.max(maxX - minX + 200, 1000);
  const rangeY = Math.max(maxY - minY + 200, 600);
  const scaleX = MAP_WIDTH / rangeX;
  const scaleY = MAP_HEIGHT / rangeY;

  return (
    <div className="absolute bottom-4 right-4 w-[180px] h-[110px] bg-[#08090a]/90 backdrop-blur-md border border-[#23252a] rounded-lg overflow-hidden shadow-2xl pointer-events-none">
      <div className="text-[9px] font-mono text-[#62666d] uppercase px-2 py-1 border-b border-[#23252a] bg-[#010102]/60">
        Radar
      </div>
      <div className="relative w-full h-[calc(100%-20px)] p-1">
        {/* Nodes mini representation */}
        {nodes.map((node) => {
          const x = (node.x - minX + 50) * scaleX;
          const y = (node.y - minY + 30) * scaleY;
          const isSel = node.fileId === selectedFileId;

          return (
            <div
              key={node.id}
              className={`absolute rounded-xs transition-colors ${
                isSel ? 'bg-[#5e6ad2] ring-1 ring-white' : 'bg-[#343842]'
              }`}
              style={{
                left: `${Math.max(2, Math.min(MAP_WIDTH - 15, x))}px`,
                top: `${Math.max(2, Math.min(MAP_HEIGHT - 35, y))}px`,
                width: `${Math.max(6, node.width * scaleX)}px`,
                height: `${Math.max(4, node.height * scaleY)}px`,
              }}
            />
          );
        })}

        {/* Viewport camera lens */}
        <div
          className="absolute border border-[#5e6ad2]/70 bg-[#5e6ad2]/10 rounded-xs"
          style={{
            left: `${Math.max(0, (-viewport.x * scaleX * 0.4))}px`,
            top: `${Math.max(0, (-viewport.y * scaleY * 0.4))}px`,
            width: `${Math.min(MAP_WIDTH - 4, (400 * scaleX) / viewport.zoom)}px`,
            height: `${Math.min(MAP_HEIGHT - 25, (300 * scaleY) / viewport.zoom)}px`,
          }}
        />
      </div>
    </div>
  );
}
