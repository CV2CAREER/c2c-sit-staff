export default function QueuePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-center py-14 px-5">
      <div className="bg-white border border-[#E5E9EF] rounded-xl px-6 py-12 text-center w-full max-w-[500px]">
        <h3 className="text-[15px] font-semibold text-[#10365A] mb-2 m-0">{title}</h3>
        <p className="text-[13px] text-[#6B7280] m-0">{description}</p>
      </div>
    </div>
  );
}
