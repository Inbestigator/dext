import { Client } from "discord.js";
import "jsr:@std/dotenv/load";
import setupCommands from "./internal/commands.ts";
import loader from "./internal/loader.ts";
import type { DextConfig } from "./internal/types.ts";
import { join } from "node:path";
import authorize from "./internal/authorize.ts";

/**
 * Creates a new Dext instance of your bot.
 */
export default async function createInstance() {
  const initLoader = loader("Initializing");

  const config = await fetchConfig();

  if (!config) {
    initLoader.error();
    throw new Error("No bot config found");
  }

  const client = new Client(config.client);
  const token = Deno.env.get("TOKEN");

  if (!token) {
    initLoader.error();
    throw new Error(
      "No bot token provided, make sure to provide a TOKEN environment variable",
    );
  }

  try {
    await Deno.mkdir("./.dext");
  } catch (err) {
    if (!(err instanceof Deno.errors.AlreadyExists)) {
      initLoader.error();
      throw err;
    }
  }

  initLoader.resolve();

  await authorize(client, token);

  client.once("ready", () => {
    loader(`Logged in as ${client.user?.displayName}`).resolve();
  });

  await setupCommands(client, config);

  async function fetchConfig(): Promise<DextConfig | null> {
    const configPath = join("file://", Deno.cwd(), "dext.config.ts");

    try {
      const configModule = await import(configPath);
      const config = configModule.default;
      if (!config) {
        throw new Error("Config not found in dext.config.ts");
      }
      return config;
    } catch (error) {
      console.error("Error loading dext.config.ts:", error);
      return null;
    }
  }
}
