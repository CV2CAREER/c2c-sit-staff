import { Tooltip, Typography } from "@material-tailwind/react";

export const Filter = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4.66667 2.66699V13.3337M4.66667 13.3337L2 10.667M4.66667 13.3337L7.33333 10.667M11.3333 2.66699V13.3337M11.3333 2.66699L14 5.33366M11.3333 2.66699L8.66667 5.33366"
      stroke="#807A7A"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Close = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.92 1.71002L14.5 0.290039L8.21 6.59004L1.91998 0.290039L0.5 1.71002L6.8 8.00004L0.5 14.2901L1.91998 15.71L8.21 9.41004L14.5 15.71L15.92 14.2901L9.62 8.00004L15.92 1.71002Z"
      fill="#404040"
    />
  </svg>
);

export const Refresh = () => (
  <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.9809 10.4212C10.1228 11.2094 9.05381 11.7307 7.9044 11.9215C6.75498 12.1123 5.57488 11.9643 4.50817 11.4956C3.44146 11.0269 2.53431 10.2577 1.89745 9.28203C1.2606 8.30634 0.921614 7.16632 0.921875 6.00118H1.92188C1.9218 7.00828 2.22586 7.99192 2.79422 8.82331C3.36258 9.65471 4.16876 10.2951 5.10718 10.6606C6.04561 11.0261 7.07254 11.0997 8.05351 10.8718C9.03448 10.6439 9.92375 10.125 10.6049 9.38318H9.15187C9.01927 9.38318 8.89209 9.3305 8.79832 9.23673C8.70455 9.14296 8.65187 9.01579 8.65187 8.88318C8.65187 8.75057 8.70455 8.62339 8.79832 8.52962C8.89209 8.43585 9.01927 8.38318 9.15187 8.38318H11.4809C11.6135 8.38318 11.7407 8.43585 11.8344 8.52962C11.9282 8.62339 11.9809 8.75057 11.9809 8.88318V11.2102C11.9809 11.3428 11.9282 11.47 11.8344 11.5637C11.7407 11.6575 11.6135 11.7102 11.4809 11.7102C11.3483 11.7102 11.2211 11.6575 11.1273 11.5637C11.0336 11.47 10.9809 11.3428 10.9809 11.2102V10.4202V10.4212ZM3.23888 2.62018H4.69188C4.82448 2.62018 4.95166 2.67286 5.04543 2.76662C5.1392 2.86039 5.19187 2.98757 5.19187 3.12018C5.19187 3.25278 5.1392 3.37996 5.04543 3.47373C4.95166 3.5675 4.82448 3.62018 4.69188 3.62018H2.36188C2.22927 3.62018 2.10209 3.5675 2.00832 3.47373C1.91455 3.37996 1.86188 3.25278 1.86188 3.12018V0.791177C1.86188 0.658569 1.91455 0.531392 2.00832 0.437624C2.10209 0.343855 2.22927 0.291177 2.36188 0.291177C2.49448 0.291177 2.62166 0.343855 2.71543 0.437624C2.8092 0.531392 2.86188 0.658569 2.86188 0.791177V1.58118C3.71983 0.791979 4.7891 0.269801 5.93902 0.0784545C7.08893 -0.112892 8.26969 0.0348832 9.33698 0.503719C10.4043 0.972556 11.3119 1.74215 11.9489 2.71844C12.5859 3.69474 12.9247 4.83545 12.9239 6.00118H11.9239C11.924 4.99395 11.6198 4.01017 11.0514 3.1787C10.4829 2.34723 9.67652 1.70685 8.73792 1.34141C7.79932 0.97598 6.77223 0.902543 5.79118 1.13072C4.81014 1.3589 3.92088 1.87805 3.23988 2.62018H3.23888Z"
      fill="#404040"
    />
  </svg>
);

export const KeywordChevronDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 1L5 5L1 1" stroke="#131A29" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function AddToolTip({
  description,
  title,
}: {
  title: string;
  description: string;
}) {
  return (
    <Tooltip
      content={
        <div className="w-80 space-y-0">
          <Typography
            variant="h6"
            placeholder=""
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            color="white"
            className="font-medium"
            onResize={() => {}}
            onResizeCapture={() => {}}
          >
            {title}
          </Typography>
          <Typography
            placeholder=""
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
            variant="small"
            color="white"
            className="font-normal opacity-80"
            onResize={() => {}}
            onResizeCapture={() => {}}
          >
            {description}
          </Typography>
        </div>
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        className="h-5 w-5 cursor-pointer text-[#B0B7C3]"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
    </Tooltip>
  );
}
