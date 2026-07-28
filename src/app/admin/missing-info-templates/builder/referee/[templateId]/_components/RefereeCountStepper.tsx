"use client";

interface RefereeCountStepperProps {
  count: number;
  onChange: (count: number) => void;
}

export default function RefereeCountStepper({ count, onChange }: RefereeCountStepperProps) {
  const MIN = 1;
  const MAX = 10;

  return (
    <div className="flex items-center justify-between bg-[#D6FAFB] rounded-[10px] px-5 py-4 mb-5">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-[#10365A]">Number of referees required:</span>
        <span className="text-[12px] text-[#6B7280] font-normal">
          Client will see one section per referee
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(Math.max(MIN, count - 1))}
          disabled={count <= MIN}
          className="w-8 h-8 rounded-lg border border-[#E5E9EF] bg-white text-[16px] font-bold text-[#10365A] flex items-center justify-center hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>
        <span className="text-[18px] font-bold min-w-[20px] text-center">{count}</span>
        <button
          onClick={() => onChange(Math.min(MAX, count + 1))}
          disabled={count >= MAX}
          className="w-8 h-8 rounded-lg border border-[#E5E9EF] bg-white text-[16px] font-bold text-[#10365A] flex items-center justify-center hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
