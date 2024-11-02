import type {
  ApplicationCommandOptionData,
  Client,
  ClientOptions,
  CommandInteraction,
} from "discord.js";

/**
 * The configuration for the bot.
 */
export interface DextConfig {
  /**
   * Discord client options.
   */
  client: ClientOptions;

  /**
   * The user id of the bot.
   */
  clientId: string;

  /**
   * The secret for the bot.
   */
  clientSecret?: string;

  /**
   * How long to cache static commands before revalidating.
   */
  cacheExpiry?: number;
}

/**
 * A command.
 */
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
