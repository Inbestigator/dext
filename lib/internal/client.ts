import { Client } from "discord.js";
import type { DextConfig } from "./types.ts";
import { join } from "node:path";
import "jsr:@std/dotenv/load";
import setupCommands from "./commands.ts";
import loader from "./loader.ts";

const config = await fetchConfig();

if (!config) {
  throw new Error("No bot config found");
}

const client = new Client(config.client);
const token = Deno.env.get("TOKEN");

if (!token) {
  throw new Error("No bot token provided");
}

try {
  await Deno.mkdir("./.dext");
} catch (err) {
  if (!(err instanceof Deno.errors.AlreadyExists)) {
    throw err;
  }
}

try {
  const authLoader = loader("Authorizing");
  await client.login(token);
  authLoader.resolve();
} catch (e) {
  console.error("Error while initializing client: ", e);
}

setupCommands(client, config);

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
