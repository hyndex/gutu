export type JobDefinition = {
  id: string;
  queue: string;
  [key: string]: unknown;
};

export type WorkflowDefinition = {
  id: string;
  initialState: string;
  states: Record<string, { on?: Record<string, string> | undefined }>;
  [key: string]: unknown;
};

export function defineJob<T extends JobDefinition>(definition: T): Readonly<T> {
  return Object.freeze({
    ...definition
  });
}

export function defineWorkflow<T extends WorkflowDefinition>(definition: T): Readonly<T> {
  return Object.freeze({
    ...definition
  });
}

export function getWorkflowTransition(
  workflow: WorkflowDefinition,
  currentState: string,
  transition: string
): string {
  const state = workflow.states[currentState];
  const nextState = state?.on?.[transition];
  if (!nextState) {
    throw new Error(`State '${currentState}' cannot execute transition '${transition}'.`);
  }

  return nextState;
}
