declare module 'date-fns' {
  export function format(date: Date | number, formatStr: string, options?: object): string;
  export function formatDistanceToNow(date: Date | number, options?: { addSuffix?: boolean; includeSeconds?: boolean; locale?: object }): string;
  export function parseISO(dateString: string, options?: object): Date;
}
