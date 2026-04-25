import * as React from "react";
import { Composer } from "../components/composer/Composer";
import { useConnections } from "../hooks/use-connections";

export function MailComposePage(): React.ReactElement {
  const { defaultConnection } = useConnections();
  return (
    <div className="grid h-full place-items-center bg-surface-1 p-6">
      <div className="w-full max-w-3xl">
        <Composer
          id={`page-${Date.now()}`}
          mode="new"
          defaultConnectionId={defaultConnection?.id}
        />
      </div>
    </div>
  );
}
