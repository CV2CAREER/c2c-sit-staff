import Link from "next/link";

export default function EmptyState({ onNewRequest }: { onNewRequest?: () => void }) {
  return (
    <div className="flex items-center justify-center py-20 px-5">
      <div className="bg-white border border-[#E5E9EF] rounded-xl px-5 py-16 text-center w-full max-w-[500px]">
        <div className="text-[30px] mb-3.5">🎉</div>
        <h3 className="text-[17px] font-semibold text-[#10365A] mb-2 m-0">No outstanding requests</h3>
        <p className="text-[13px] text-[#6B7280] mb-5 m-0">
          Every client has responded. Nothing to chase right now.
        </p>
        {onNewRequest ? (
          <button
            onClick={onNewRequest}
            className="inline-flex items-center bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors"
          >
            + Send a new request
          </button>
        ) : (
          <Link
            href="/admin/missing-information"
            className="inline-flex items-center bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors"
          >
            + Send a new request
          </Link>
        )}
      </div>
    </div>
  );
}
