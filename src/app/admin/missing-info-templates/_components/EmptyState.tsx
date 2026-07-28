"use client";

interface EmptyStateProps {
  onNewTemplate: () => void;
}

export default function EmptyState({ onNewTemplate }: EmptyStateProps) {
  return (
    <div className="bg-white border border-[#E5E9EF] rounded-xl px-5 py-16 text-center">
      <div className="text-[30px] mb-3.5">📋</div>
      <h3 className="text-[17px] font-semibold text-[#10365A] mb-2 m-0">No templates published</h3>
      <p className="text-[13px] text-[#6B7280] mb-5 max-w-[420px] mx-auto m-0">
        Templates let you reuse missing-info requests across clients — start with the most common patterns.
      </p>
      <div className="flex items-center gap-2.5 justify-center">
        <button
          className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors"
        >
          View suggested templates
        </button>
        <button
          onClick={onNewTemplate}
          className="bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors"
        >
          + New template
        </button>
      </div>
    </div>
  );
}
