/**
 * Phase 2 stub: dispatch third-party Workers via Workers for Platforms.
 * Connector runtime must not call this path in production until enabled.
 */
export class WorkerRuntimeNotEnabledError extends Error {
  constructor() {
    super("Integration worker runtime is not enabled yet (Phase 2)");
    this.name = "WorkerRuntimeNotEnabledError";
  }
}

export async function dispatchIntegrationWorker(_input: {
  installId: string;
  workerEntry: string;
  payload: unknown;
}): Promise<never> {
  throw new WorkerRuntimeNotEnabledError();
}
