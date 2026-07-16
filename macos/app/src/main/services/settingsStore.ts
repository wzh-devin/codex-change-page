import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const SettingsSchema = z.object({
  schemaVersion: z.literal(1),
  onboardingComplete: z.boolean(),
  openAtLogin: z.boolean(),
  backgroundResident: z.boolean(),
  autoReapply: z.boolean(),
  logRetentionDays: z.number().int().min(1).max(90),
}).strict();

export type Settings = z.infer<typeof SettingsSchema>;

const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  onboardingComplete: false,
  openAtLogin: false,
  backgroundResident: true,
  autoReapply: false,
  logRetentionDays: 14,
};

async function write(file: string, value: Settings) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
}

export class SettingsStore {
  constructor(readonly file: string) {}

  async get(): Promise<Settings> {
    try {
      return SettingsSchema.parse(JSON.parse(await fs.readFile(this.file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULT_SETTINGS };
      throw error;
    }
  }

  async update(patch: Partial<Omit<Settings, "schemaVersion">>): Promise<Settings> {
    const next = SettingsSchema.parse({ ...await this.get(), ...patch, schemaVersion: 1 });
    await write(this.file, next);
    return next;
  }
}
