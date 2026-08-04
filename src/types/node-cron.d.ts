declare module 'node-cron' {
  export class ScheduledTask {
    start(): void;
    stop(): void;
  }

  export function schedule(
    expression: string,
    func: () => void,
    options?: {
      scheduled?: boolean;
      timezone?: string;
    }
  ): ScheduledTask;
}
