import type { Command as CommandType } from "./internal/types.ts";

export interface CommandData
  extends Omit<CommandType, "name" | "default" | "pregenerated"> {}

export type { DextConfig } from "./internal/types.ts";
