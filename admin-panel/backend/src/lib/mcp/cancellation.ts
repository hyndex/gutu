/** Per-request cancellation. The MCP `notifications/cancelled`
 *  notification carries `{ requestId, reason }`. We register an
 *  AbortController against each in-flight request id; on cancel we
 *  abort the controller and let the running handler observe the
 *  signal.
 *
 *  In-memory only. A restart drops every controller — that's fine
 *  because the request itself dies with the process. */

const PENDING = new Map<string | number, AbortController>();

/** Begin tracking a request. Returns the AbortController the handler
 *  may pass to fetch / Promise.race / etc. */
export function track(requestId: string | number): AbortController {
  const ctrl = new AbortController();
  PENDING.set(requestId, ctrl);
  return ctrl;
}

/** Stop tracking. Always called from a `finally` block in the
 *  request handler so a completed request doesn't leak its
 *  controller. */
export function untrack(requestId: string | number): void {
  PENDING.delete(requestId);
}

/** Abort an in-flight request. Returns true if a controller was
 *  found, false if the request had already completed. */
export function cancel(requestId: string | number, reason: string): boolean {
  const ctrl = PENDING.get(requestId);
  if (!ctrl) return false;
  ctrl.abort(new Error(reason || "cancelled"));
  PENDING.delete(requestId);
  return true;
}

/** Test-only: clear all tracked controllers. */
export function _resetCancellation_forTest(): void {
  for (const ctrl of PENDING.values()) ctrl.abort();
  PENDING.clear();
}
