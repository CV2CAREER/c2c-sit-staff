import { motion } from "framer-motion";

export function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`min-w-0 w-full rounded-xl border border-[#EAECF0] bg-white p-5 transition-all duration-200 hover:border-primary/40 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      <h4 className="min-w-0 break-words text-[13.5px] font-bold text-gray-900 mb-4 tracking-tight flex items-center gap-2">
        <span>{title}</span>
      </h4>
      <div className="flex flex-col gap-4 sm:gap-5 min-w-0">{children}</div>
    </motion.div>
  );
}

export function SubSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number | string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full">
      <div className="flex justify-between items-baseline mb-2 min-w-0">
        <h5 className="min-w-0 break-words text-[11.5px] font-medium text-[#667085]">{title}</h5>
        {count !== undefined ? (
          <span className="text-[11.5px] text-[#667085]">
            <b className="text-gray-900 font-semibold">{count}</b> selected
          </span>
        ) : null}
      </div>
      <div className='empty:before:content-["N/A"] empty:before:text-gray-400 empty:before:text-xs empty:before:italic w-full min-w-0 max-w-full flex gap-2 flex-wrap items-center'>
        {children}
      </div>
    </div>
  );
}
