import * as React from "react";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/primitives/Toast";
import { useRuntime } from "@/runtime/context";
import type { ToastPayload } from "@/runtime/context";

export function Toaster() {
  const runtime = useRuntime();
  const [items, setItems] = React.useState<ToastPayload[]>([]);

  React.useEffect(() => {
    return runtime.bus.on("toast:add", (p) => {
      setItems((prev) => [...prev, p]);
    });
  }, [runtime]);

  return (
    <ToastProvider swipeDirection="right">
      {items.map((t) => (
        <Toast
          key={t.id}
          intent={t.intent ?? "default"}
          duration={t.durationMs ?? 4500}
          onOpenChange={(open) => {
            if (!open) setItems((prev) => prev.filter((x) => x.id !== t.id));
          }}
        >
          <ToastTitle>{t.title}</ToastTitle>
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
