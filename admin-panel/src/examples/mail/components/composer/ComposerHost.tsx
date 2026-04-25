import * as React from "react";
import { Composer } from "./Composer";
import { useMailStore } from "../../store";
import { useConnections } from "../../hooks/use-connections";

export function ComposerHost(): React.ReactElement {
  const composers = useMailStore((s) => s.composers);
  const { defaultConnection } = useConnections();
  return (
    <>
      {composers.map((c) => (
        <Composer
          key={c.id}
          id={c.id}
          mode={c.mode}
          threadId={c.threadId}
          inReplyToMessageId={c.inReplyToMessageId}
          draftId={c.draftId}
          defaultConnectionId={defaultConnection?.id}
          minimized={c.minimized}
        />
      ))}
    </>
  );
}
