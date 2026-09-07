import { Server, Lock, ArrowRight, ShieldCheck, Database } from 'lucide-react';

interface RealApiSchemaCardProps {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint?: string;
  serviceName?: string;
  requestSchema?: string;
  responseSchema?: string;
}

export function RealApiSchemaCard({
  method = 'POST',
  endpoint = '/v1/agent/run',
  serviceName = 'FastAPI Agent Service',
  requestSchema = '{ query: str, context_window: int }',
  responseSchema = '{ response: str, tokens_used: int }',
}: RealApiSchemaCardProps) {
  const methodColor =
    method === 'POST'
      ? 'bg-[#5e6ad2] text-white'
      : method === 'GET'
      ? 'bg-[#10b981] text-white'
      : 'bg-[#f59e0b] text-white';

  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl p-3.5 flex flex-col gap-3 font-mono shadow-2xl">
      {/* Header with Method and Route */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1c1d22]">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodColor}`}>
            {method}
          </span>
          <span className="text-xs font-semibold text-[#f7f8f8] truncate max-w-[240px]">
            {endpoint}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#34d399] bg-[#10b981]/15 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" />
          <span>Server Protected</span>
        </div>
      </div>

      {/* Contract Schemas */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-2 rounded-lg bg-[#121316] border border-[#23252a] flex flex-col justify-between">
          <span className="text-[#8a8f98] font-bold">Request Body:</span>
          <code className="text-[#828fff] text-[9px] mt-1 truncate">
            {requestSchema}
          </code>
        </div>
        <div className="p-2 rounded-lg bg-[#121316] border border-[#23252a] flex flex-col justify-between">
          <span className="text-[#8a8f98] font-bold">Return Schema:</span>
          <code className="text-[#34d399] text-[9px] mt-1 truncate">
            {responseSchema}
          </code>
        </div>
      </div>

      {/* Telemetry Footer */}
      <div className="flex items-center justify-between text-[10px] text-[#8a8f98] pt-1 border-t border-[#1c1d22]">
        <span className="flex items-center gap-1">
          <Server className="w-3 h-3 text-[#5e6ad2]" /> {serviceName}
        </span>
        <span className="flex items-center gap-1 text-[#34d399]">
          <Database className="w-3 h-3" /> Async Pydantic
        </span>
      </div>
    </div>
  );
}
