import * as React from "react";
import type { DetailView as DetailViewDef } from "@/contracts/views";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { ErrorState } from "@/admin-primitives/ErrorState";
import { Skeleton } from "@/admin-primitives/Skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/primitives/Tabs";
import { Button } from "@/primitives/Button";
import { useRecord } from "@/runtime/hooks";
import { useRuntime } from "@/runtime/context";
import { ActionButton } from "./ListView";
import { navigateTo } from "./useRoute";

export interface DetailViewRendererProps {
  view: DetailViewDef;
  id: string;
  editPath?: string;
  basePath: string;
}

export function DetailViewRenderer({
  view,
  id,
  editPath,
  basePath,
}: DetailViewRendererProps) {
  const runtime = useRuntime();
  const { data, loading, error } = useRecord(view.resource, id);
  const [tab, setTab] = React.useState(view.tabs[0]?.id ?? "");

  if (loading)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={() => runtime.resources.refresh(view.resource)}
      />
    );
  if (!data)
    return (
      <ErrorState
        title="Not found"
        description={`No ${view.title.toLowerCase()} with id "${id}".`}
        onRetry={() => navigateTo(basePath)}
      />
    );

  const detailActions = view.actions?.filter(
    (a) => !a.placement || a.placement.includes("detail"),
  ) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={view.header ? view.header(data) : (data.name as string) ?? view.title}
        description={view.description}
        actions={
          <>
            {editPath && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigateTo(editPath)}
              >
                Edit
              </Button>
            )}
            {detailActions.map((a) => (
              <ActionButton
                key={a.id}
                action={a}
                records={[data]}
                resource={view.resource}
                runtime={runtime}
                size="sm"
              />
            ))}
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {view.tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {view.tabs.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            {t.render(data)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
