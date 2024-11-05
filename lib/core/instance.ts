import "@std/dotenv/load";
import { Client } from "discord.js";
import setupCommands from "./commands.ts";
import loader from "../internal/loader.ts";
import type { DextConfig } from "../internal/types.ts";
import { join } from "node:path";
import authorize from "./authorize.ts";
import setupComponents from "./components.ts";
import { delay } from "@std/async/delay";
import setupEvents from "./events.ts";
import { yellow } from "@std/fmt/colors";
let readyToReload = false;

/**
 * Creates a new Dext instance of your bot.
 */
export async function createInstance() {
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

  initLoader.resolve();

  await authorize(client, token);

  client.once("ready", () => {
    loader(`Logged in as ${client.user?.displayName}`).resolve();
  });

  await reloadGenerators();

  if (Deno.env.get("DEXT_ENV") === "build") {
    Deno.exit(0);
  } else {
    const watcher = Deno.watchFs(Deno.cwd());
    for await (const event of watcher) {
      if (
        (event.kind === "modify" ||
          event.kind === "create" ||
          event.kind === "remove") &&
        readyToReload
      ) {
        if (
          !event.paths.some((path) => path.includes(".dext")) &&
          readyToReload
        ) {
          readyToReload = false;
          console.log("File change detected");
          await delay(500);
          reloadGenerators();
        }
      }
    }
  }

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

  async function reloadGenerators() {
    if (!config) return;

    if (Deno.env.get("DEXT_ENV") !== "production") {
      try {
        Deno.removeSync("../.dext/commands", { recursive: true });
        Deno.removeSync("../.dext/components", { recursive: true });
      } catch {
        // pass
      }
    }

    startTimeoutWarning();
    await setupCommands(client, config);
    resetTimeoutWarning();
    await setupComponents(client, config);
    resetTimeoutWarning();
    if (Deno.env.get("DEXT_ENV") !== "build") {
      await setupEvents(client);
    }

    readyToReload = true;
  }
}

let timeout: number | null = null;

function startTimeoutWarning() {
  timeout = setTimeout(() => {
    if (!readyToReload) {
      console.log(
        `\r ${
          yellow(
            "!",
          )
        } This is taking a while to generate. If it hangs too long, try restarting the process. This is usually just caused by Discord API rate limits.`,
      );
    }
  }, 5000);
}

function resetTimeoutWarning() {
  if (timeout !== null) {
    clearTimeout(timeout);
  }
  startTimeoutWarning();
}
