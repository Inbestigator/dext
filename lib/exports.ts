import type { Command as CommandType } from "./internal/types.ts";

export interface CommandData
  extends Omit<CommandType, "default" | "pregenerated"> {}
