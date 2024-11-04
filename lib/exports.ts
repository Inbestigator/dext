import createInstance from "./core/instance.ts";
import type {
  Command as CommandType,
  Component as ComponentType,
} from "./internal/types.ts";

/**
 * Configuration for a specific command.
 *
 * Specify the description and options here.
 */
export interface CommandData extends Omit<CommandType, "name" | "default"> {}

/**
 * Configuration for a specific component.
 */
export interface ComponentData
  extends Omit<ComponentType, "name" | "default" | "category"> {}

export type { DextConfig } from "./internal/types.ts";

export default createInstance;
