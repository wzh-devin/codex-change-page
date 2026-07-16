export class OperationBusyError extends Error {
  readonly code = "OPERATION_BUSY";

  constructor(activeOperation: string) {
    super(`Operation ${activeOperation} is already running.`);
    this.name = "OperationBusyError";
  }
}

export class OperationQueue {
  private activeOperation: string | null = null;

  get active() {
    return this.activeOperation;
  }

  async run<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (this.activeOperation) throw new OperationBusyError(this.activeOperation);
    this.activeOperation = name;
    try {
      return await operation();
    } finally {
      this.activeOperation = null;
    }
  }
}
