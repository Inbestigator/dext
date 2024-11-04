import "@std/dotenv/load";
import { Client } from "discord.js";
import setupCommands from "./core/commands.ts";
import loader from "./internal/loader.ts";
import type { DextConfig } from "./internal/types.ts";
import { dirname, join } from "node:path";
import authorize from "./core/authorize.ts";
import { Command } from "commander";
import setupComponents from "./core/components.ts";
import { delay } from "@std/async/delay";

const program = new Command();
let readyToReload = false;

program.name("dext").description("Compile Discord.js commands at build time.");

program
  .command("dev")
  .description("Starts the bot in development mode.")
  .action(async () => {
    Deno.env.set("DEXT_ENV", "development");
    await createInstance();
  });

program
  .command("build")
  .description("Build the bot's files in production mode.")
  .action(async () => {
    await createInstance();
  });

program
  .command("create-new")
  .description("Create a new Dext bootstrapped bot.")
  .argument("[name]", "Project name")
  .option("-t, --token <token>", "Bot token")
  .option("-s, --simple", "Use a simple template")
  .action((name, { token, simple }) => {
    if (!name) {
      name = prompt("Project name:");
    }
    if (!name) {
      console.log("Project name cannot be empty.");
      Deno.exit(1);
    }
    if (!token) {
      token = prompt("Bot token (optional in this process):");
    }
    if (simple === undefined) {
      simple = confirm("Do you want to use a simple template?");
    }
    const mkdirLoader = loader(`Creating files for project: ${name}`);

    async function createFiles(path: string, dest: string) {
      Deno.mkdirSync(dest, { recursive: true });
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const json = await response.json();
      if (Array.isArray(json)) {
        for (const file of json) {
          if (file.type === "dir") {
            createFiles(file.url, join(dest, file.name));
          } else {
            const fileRes = await fetch(file.download_url);
            if (!fileRes.ok) {
              throw new Error(fileRes.statusText);
            }
            let fileContents = await fileRes.text();
            let destPath = join(dest, file.name);
            if (file.name === ".env.example" && token) {
              fileContents = `TOKEN="${token}"`;
              destPath = join(dest, ".env");
            }
            Deno.mkdirSync(dirname(destPath), { recursive: true });
            Deno.writeTextFileSync(destPath, fileContents);
          }
        }
      }
    }

    try {
      const path = simple
        ? "https://api.github.com/repos/Inbestigator/dext/contents/templates/simple"
        : "https://api.github.com/repos/Inbestigator/dext/contents/templates/base";

      createFiles(path, join(Deno.cwd(), name));
    } catch {
      mkdirLoader.error();
      Deno.exit(1);
    }
    mkdirLoader.resolve();

    console.log(
      `Project created successfully. Please run\n$ cd ${name}${
        !token ? "\nAdd your bot's token to .env" : ""
      }\n$ deno install\n$ dext dev`,
    );
  });

program.parse();

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

  initLoader.resolve();

  await authorize(client, token);

  client.once("ready", () => {
    loader(`Logged in as ${client.user?.displayName}`).resolve();
  });

  await reloadGenerators();

  if (Deno.env.get("DEXT_ENV") !== "development") {
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

    try {
      Deno.removeSync("./.dext/commands", { recursive: true });
      Deno.removeSync("./.dext/components", { recursive: true });
    } catch {
      // pass
    }

    setTimeout(() => {
      if (!readyToReload) {
        console.log(
          "\n \x1b[33m!\x1b[0m",
          "This is taking a while to generate, if it hangs too long, try restarting the process. This is usually just caused by Discord API rate limits.",
        );
      }
    }, 5000);

    await setupCommands(client, config);
    await setupComponents(client, config);

    readyToReload = true;
  }
}
