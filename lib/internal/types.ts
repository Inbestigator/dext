import type {
  ApplicationCommandOptionData,
  Client,
  ClientOptions,
  CommandInteraction,
} from "discord.js";

export interface DextConfig {
  client: ClientOptions;
  clientId: string;
  clientSecret?: string;
  cacheExpiry: number;
}

export interface Command {
  /**
   * Name of command, internal
   */
  name: string;

  /**
   * The description of this command.
   */
  description: string;

  /**
   * The options of this command.
   */
  options?: ApplicationCommandOptionData[];

  /**
   * Internal runner
   */
  default: (interaction: CommandInteraction, client: Client) => unknown;

  pregenerated?: boolean;
}
