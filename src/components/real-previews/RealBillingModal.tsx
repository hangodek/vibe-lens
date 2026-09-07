import { Check, ShieldCheck, ArrowRight } from 'lucide-react';

export function RealBillingModal() {
  return (
    <div className="w-full bg-[#08090a] border border-[#23252a] rounded-xl p-4 flex flex-col gap-4 shadow-2xl">
      <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
        <div>
          <h4 className="text-xs font-semibold text-[#f7f8f8]">Select Plan Tier</h4>
          <p className="text-[10px] text-[#8a8f98]">Scale your monthly quota seamlessly</p>
        </div>
        <span className="text-[10px] font-mono text-[#34d399] bg-[#10b981]/15 px-2 py-0.5 rounded-full">
          Monthly Billing
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Free Starter */}
        <div className="p-3 rounded-lg border border-[#23252a] bg-[#121316] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#f7f8f8]">Developer</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              $0 <span className="text-[10px] text-[#8a8f98] font-normal">/mo</span>
            </div>
            <div className="text-[10px] text-[#8a8f98] mt-2 space-y-1 font-mono">
              <div>✓ 100k events</div>
              <div>✓ 1 seat</div>
            </div>
          </div>
          <button className="w-full mt-3 py-1.5 bg-[#1c1d22] text-[#8a8f98] text-[11px] font-medium rounded-md border border-[#23252a]">
            Current Plan
          </button>
        </div>

        {/* Pro Scale */}
        <div className="p-3 rounded-lg border border-[#5e6ad2] bg-[#121316] relative flex flex-col justify-between shadow-[0_0_12px_rgba(94,106,210,0.2)]">
          <span className="absolute -top-2 right-2 bg-[#5e6ad2] text-[9px] uppercase tracking-wider text-white px-1.5 py-0.2 rounded-full font-bold">
            Popular
          </span>
          <div>
            <span className="text-[11px] font-semibold text-[#f7f8f8]">Pro Scale</span>
            <div className="text-xl font-bold font-mono text-[#828fff] mt-1">
              $29 <span className="text-[10px] text-[#8a8f98] font-normal">/mo</span>
            </div>
            <div className="text-[10px] text-[#d0d6e0] mt-2 space-y-1 font-mono">
              <div>✓ Unlimited events</div>
              <div>✓ Team seats & SSO</div>
            </div>
          </div>
          <button className="w-full mt-3 py-1.5 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs">
            <span>Upgrade</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
