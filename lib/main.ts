import "@std/dotenv/load";
import { Client } from "discord.js";
import setupCommands from "./core/commands.ts";
import loader from "./internal/loader.ts";
import type { DextConfig } from "./internal/types.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import authorize from "./core/authorize.ts";
import { Command } from "commander";

const program = new Command();

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
  .option("-n, --name <name>", "Project name")
  .option("-t, --token <token>", "Bot token")
  .option("-s, --simple", "Use a simple example")
  .action(({ name, token, simple }) => {
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
      simple = confirm("Do you want to use a simple example?");
    }
    const mkdirLoader = loader(`Creating files for project: ${name}`);

    function createFiles(path: string, dest: string) {
      const contents = Deno.readDirSync(path);

      Deno.mkdirSync(dest, { recursive: true });

      for (const file of contents) {
        const sourcePath = join(path, file.name);
        let destPath = join(dest, file.name);

        if (file.isDirectory) {
          createFiles(sourcePath, destPath);
        } else {
          let fileContents = Deno.readTextFileSync(sourcePath);
          if (file.name === ".env.example" && token) {
            fileContents = `TOKEN="${token}"`;
            destPath = join(dest, ".env");
          }
          Deno.writeTextFileSync(destPath, fileContents);
        }
      }
    }

    try {
      const example = simple ? "../examples/simple" : "../examples/base";

      let basePath = "";

      if (new URL(import.meta.url).protocol === "file:") {
        basePath = join(dirname(fileURLToPath(import.meta.url)), example);
      } else if (new URL(import.meta.url).protocol === "https:") {
        basePath = new URL(example, import.meta.url).toString();
      }

      createFiles(basePath, join(Deno.cwd(), name));
    } catch (err) {
      console.log(err);
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

  if (Deno.env.get("DEXT_ENV") !== "development") {
    Deno.exit(0);
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
}
