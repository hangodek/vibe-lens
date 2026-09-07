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

  const rangeX = Math.max(maxX - minX + 240, 1000);
  const rangeY = Math.max(maxY - minY + 240, 600);
  const scaleX = MAP_WIDTH / rangeX;
  const scaleY = MAP_HEIGHT / rangeY;

  // Compute camera lens bounds in radar coordinates
  const canvasWindowW = typeof window !== 'undefined' ? window.innerWidth - 440 : 1000;
  const canvasWindowH = typeof window !== 'undefined' ? window.innerHeight - 80 : 700;

  const virtualLeft = -viewport.x / viewport.zoom;
  const virtualTop = -viewport.y / viewport.zoom;
  const virtualWidth = canvasWindowW / viewport.zoom;
  const virtualHeight = canvasWindowH / viewport.zoom;

  const lensX = Math.max(0, Math.min(MAP_WIDTH - 20, (virtualLeft - minX + 60) * scaleX));
  const lensY = Math.max(0, Math.min(MAP_HEIGHT - 20, (virtualTop - minY + 40) * scaleY));
  const lensW = Math.max(16, Math.min(MAP_WIDTH, virtualWidth * scaleX));
  const lensH = Math.max(12, Math.min(MAP_HEIGHT, virtualHeight * scaleY));

  return (
    <div className="absolute bottom-4 right-4 w-[180px] h-[110px] bg-[#08090a]/90 backdrop-blur-md border border-[#23252a] rounded-lg overflow-hidden shadow-2xl pointer-events-none z-30">
      <div className="text-[9px] font-mono text-[#62666d] uppercase px-2 py-1 border-b border-[#23252a] bg-[#010102]/60 flex items-center justify-between">
        <span>Radar</span>
        <span className="text-[#5e6ad2]">{nodes.length} nodes</span>
      </div>
      <div className="relative w-full h-[calc(100%-20px)] p-1">
        {/* Nodes mini representation */}
        {nodes.map((node) => {
          const x = (node.x - minX + 60) * scaleX;
          const y = (node.y - minY + 40) * scaleY;
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
                width: `${Math.max(5, node.width * scaleX)}px`,
                height: `${Math.max(4, node.height * scaleY)}px`,
              }}
            />
          );
        })}

        {/* Viewport camera lens */}
        <div
          className="absolute border border-[#5e6ad2] bg-[#5e6ad2]/15 rounded-xs pointer-events-none"
          style={{
            left: `${lensX}px`,
            top: `${lensY}px`,
            width: `${lensW}px`,
            height: `${lensH}px`,
          }}
        />
      </div>
    </div>
  );
}
