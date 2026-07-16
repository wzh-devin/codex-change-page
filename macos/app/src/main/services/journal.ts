import fs from "node:fs/promises";
import path from "node:path";

export type JournalEntry = {
  schemaVersion: 1;
  operationId: string;
  command: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
};

async function atomicWrite(file: string, value: JournalEntry) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
}

export class OperationJournal {
  constructor(readonly file: string) {}

  async read(): Promise<JournalEntry | null> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as JournalEntry;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async start(operationId: string, command: string) {
    const entry: JournalEntry = {
      schemaVersion: 1,
      operationId,
      command,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    await atomicWrite(this.file, entry);
    return entry;
  }

  async complete(operationId: string, success: boolean) {
    const current = await this.read();
    if (!current || current.operationId !== operationId) {
      throw new Error("Operation journal identity does not match.");
    }
    await atomicWrite(this.file, {
      ...current,
      status: success ? "completed" : "failed",
      completedAt: new Date().toISOString(),
    });
  }

  async interrupted() {
    const entry = await this.read();
    return entry?.status === "running" ? entry : null;
  }
}
