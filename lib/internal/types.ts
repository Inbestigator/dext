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

  /**
   * If the command is pregenerated
   */
  pregenerated?: boolean;

  /**
   * How long to cache this static command before revalidating.
   *
   * **Overrides `cacheExpiry` config**
   */
  revalidate?: number;
}

export interface Component {
  /**
   * Name of component, internal
   */
  name: string;

  /**
   * Type of component, internal
   */
  type: number;

  /**
   * Internal runner
   */
  default: (interaction: CommandInteraction, client: Client) => unknown;

  /**
   * If the component is pregenerated
   */
  pregenerated?: boolean;

  /**
   * How long to cache this static component before revalidating.
   *
   * **Overrides `cacheExpiry` config**
   */
  revalidate?: number;
}
