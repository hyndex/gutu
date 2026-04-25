/** Bun-side cron scheduler for plugin jobs.
 *
 *  Pluggable so other plugins can register their own intervals. Each
 *  registered job runs on a fixed interval and is wrapped in a try/catch
 *  so a single failing tick doesn't bring down the scheduler. */

export interface ScheduledTask {
  id: string;
  intervalMs: number;
  runOnStart?: boolean;
  fn: () => Promise<void> | void;
  /** Skip running if a prior tick is still in flight. Default true. */
  skipIfBusy?: boolean;
}

const tasks: ScheduledTask[] = [];
const running = new Set<string>();
const timers = new Map<string, ReturnType<typeof setInterval>>();
let started = false;

export function registerJob(task: ScheduledTask): void {
  tasks.push(task);
  if (started) startOne(task);
}

export function startScheduler(): void {
  if (started) return;
  started = true;
  for (const t of tasks) startOne(t);
}

export function stopScheduler(): void {
  for (const t of timers.values()) clearInterval(t);
  timers.clear();
  started = false;
}

function startOne(t: ScheduledTask): void {
  if (timers.has(t.id)) return;
  if (t.runOnStart) tickSafe(t);
  const handle = setInterval(() => tickSafe(t), t.intervalMs);
  (handle as unknown as { unref?: () => void }).unref?.();
  timers.set(t.id, handle);
}

async function tickSafe(t: ScheduledTask): Promise<void> {
  if ((t.skipIfBusy ?? true) && running.has(t.id)) return;
  running.add(t.id);
  try {
    await t.fn();
  } catch (err) {
    console.error(`[mail.job:${t.id}] failed`, err);
  } finally {
    running.delete(t.id);
  }
}
