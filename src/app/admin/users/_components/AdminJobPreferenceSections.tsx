import { Chip } from "@material-tailwind/react";

export function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[1.375rem] font-medium">
        <span>{title}</span>
      </h4>
      <div className="grid mt-4 gap-6">{children}</div>
    </div>
  );
}

export function SubSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="">
      <h5 className="text-[#797979] font-medium mb-1">{title}</h5>
      <div className='empty:before:content-["N/A"] w-full sm:w-80 flex gap-2 flex-wrap'>
        {Array.isArray(children)
          ? children.map?.((c,i) => (
            <Chip
              key={i}
              value={c.length >= 28 ? c.substring(0, 27) + '...' : c}
              variant="ghost"
              size="sm"
              className="!text-xs text-[#797979] !font-normal !capitalize"
            />
          ))
          : children}
      </div>
    </div>
  );
}