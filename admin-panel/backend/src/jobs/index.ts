/** Bootstrap all mail-related background jobs. */

import { startScheduler } from "./scheduler";
import { registerMailSync } from "./mail-sync";
import { registerMailSend } from "./mail-send";
import { registerMailSnooze } from "./mail-snooze";
import { registerMailVacation } from "./mail-vacation";
import { registerMailCleanup } from "./mail-cleanup";
import { registerMailIndex } from "./mail-index";
import { registerMailSubscription } from "./mail-subscription";
import { registerOauthRefresh } from "./oauth-refresh";

export function bootstrapMailJobs(): void {
  registerMailSync();
  registerMailSend();
  registerMailSnooze();
  registerMailVacation();
  registerMailCleanup();
  registerMailIndex();
  registerMailSubscription();
  registerOauthRefresh();
  startScheduler();
}
