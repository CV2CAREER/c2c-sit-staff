interface AgeIndicatorProps {
  ageDays: number;
}

export default function AgeIndicator({ ageDays }: AgeIndicatorProps) {
  let color = "text-[#9CA3AF]";

  if (ageDays >= 7) {
    color = "text-[#DC2626]";
  } else if (ageDays >= 3) {
    color = "text-[#B45309]";
  }

  return (
    <span className={`text-[13px] font-bold ${color}`}>
      {ageDays} days
    </span>
  );
}
