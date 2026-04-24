import * as React from "react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { FreshnessIndicator } from "@/admin-primitives/FreshnessIndicator";
import { WorkspaceRenderer } from "@/admin-primitives/widgets/WorkspaceRenderer";
import type { WorkspaceDescriptor } from "@/contracts/widgets";
import type { CustomView } from "@/contracts/views";

/** Factory for Control-Room dashboards — a consistent pattern used across
 *  every plugin. Pass a WorkspaceDescriptor; get back a CustomView with the
 *  standard PageHeader + freshness indicator + WorkspaceRenderer. */
export function buildControlRoom(args: {
  viewId: string;
  resource: string;
  title: string;
  description?: string;
  workspace: WorkspaceDescriptor;
}): CustomView {
  return defineCustomView({
    id: args.viewId,
    title: args.title,
    description: args.description,
    resource: args.resource,
    render: () => {
      const [asOf, setAsOf] = React.useState(new Date());
      React.useEffect(() => {
        const t = setInterval(() => setAsOf(new Date()), 30_000);
        return () => clearInterval(t);
      }, []);
      return (
        <div className="flex flex-col gap-5">
          <PageHeader
            title={args.title}
            description={args.description}
            actions={<FreshnessIndicator lastUpdatedAt={asOf} live />}
          />
          <WorkspaceRenderer workspace={args.workspace} />
        </div>
      );
    },
  });
}
