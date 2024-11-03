import type { Command as CommandType } from "./internal/types.ts";
import createInstance from "./main.ts";

/**
 * Configuration for a specific command.
 *
 * Specify the description and options here.
 */
export interface CommandData extends Omit<CommandType, "name" | "default"> {}

export type { DextConfig } from "./internal/types.ts";

export default createInstance;
