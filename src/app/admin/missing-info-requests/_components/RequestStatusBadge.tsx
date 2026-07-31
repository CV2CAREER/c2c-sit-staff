interface RequestStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "text-[#6B7280]",
  viewed: "text-[#B45309]",
  in_progress: "text-[#0B96D6]",
  submitted: "text-[#16A34A]",
  expired: "text-[#9CA3AF]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  viewed: "Viewed",
  in_progress: "In Progress",
  submitted: "Submitted",
  expired: "Expired",
};

export default function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const color = STATUS_STYLES[status] ?? "text-[#6B7280]";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className={`text-[13px] font-semibold ${color}`}>
      {label}
    </span>
  );
}
