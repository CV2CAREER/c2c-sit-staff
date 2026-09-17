import { Chip } from "@material-tailwind/react";
import { motion } from "framer-motion";

export function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-w-0 rounded-2xl border border-career-gray-300/60 bg-career-gray-400/60 p-4 transition-colors duration-200 hover:border-career-blue-300"
    >
      <h4 className="min-w-0 break-words text-[1.1rem] font-medium text-career-black-200">
        <span>{title}</span>
      </h4>
      <div className="grid mt-4 gap-6 min-w-0">{children}</div>
    </motion.div>
  );
}

export function SubSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 max-w-full">
      <h5 className="min-w-0 break-words text-[#797979] font-medium mb-1.5">{title}</h5>
      <div className='empty:before:content-["N/A"] empty:before:text-career-gray-200 w-full min-w-0 max-w-full flex gap-2 flex-wrap'>
        {Array.isArray(children)
          ? children.map?.((c,i) => (
            <Chip
              key={i}
              value={c.length >= 28 ? c.substring(0, 27) + '...' : c}
              variant="ghost"
              size="sm"
              className="!whitespace-normal !break-words max-w-full !text-xs text-career-blue-800 !font-medium !capitalize !bg-career-blue-800/10"
            />
          ))
          : children}
      </div>
    </div>
  );
}