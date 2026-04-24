import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/primitives/Dialog";
import { Button } from "@/primitives/Button";
import { useRuntime } from "@/runtime/context";
import type { ConfirmRequest } from "@/runtime/context";

export function ConfirmHost() {
  const runtime = useRuntime();
  const [req, setReq] = React.useState<ConfirmRequest | null>(null);

  React.useEffect(
    () => runtime.bus.on("confirm:open", (r) => setReq(r)),
    [runtime],
  );

  const close = (result: boolean) => {
    if (!req) return;
    runtime.bus.emit("confirm:resolve", { id: req.id, result });
    setReq(null);
  };

  return (
    <Dialog open={!!req} onOpenChange={(open) => !open && close(false)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{req?.title}</DialogTitle>
          {req?.description && (
            <DialogDescription>{req.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            variant={req?.destructive ? "danger" : "primary"}
            onClick={() => close(true)}
          >
            {req?.destructive ? "Delete" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
