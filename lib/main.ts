import "@std/dotenv/load";
import { Client } from "discord.js";
import setupCommands from "./core/commands.ts";
import loader from "./internal/loader.ts";
import type { DextConfig } from "./internal/types.ts";
import { join } from "node:path";
import authorize from "./core/authorize.ts";
import { Command } from "commander";

const program = new Command();

program.name("dext").description("Compile Discord.js commands at build time.");

program
  .command("dev")
  .description("Starts the bot in development mode.")
  .action(async () => {
    await createInstance();
  });

program
  .command("create-new")
  .description("Create a new Dext bootstrapped bot.")
  .action(async () => {
    const projectName = prompt("Project name:");
    if (!projectName) {
      console.log("Project name cannot be empty.");
      return;
    }
    const token = prompt("Bot token (optional in this process):");
    const mkdirLoader = loader(`Creating files for project: ${projectName}`);

    try {
      const config = `import type { DextConfig } from "@inbestigator/dext";

const config: DextConfig = {
  client: { intents: [] },
  clientId: "", // Reccomended to replace with your bot's client ID
};

export default config;
`;

      const dynamicCmd = `import type { CommandInteraction } from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "Returns a greeting",
  options: [],
};

export default function dynamicCmd(interaction: CommandInteraction) {
  interaction.reply({
    content: \`Hey there, \${interaction.user.displayName}!\`,
    ephemeral: true,
  });
}
`;

      const staticCmd = `import type { CommandInteraction } from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "Shows how a pregenerated command doesn't run every time",
  options: [],
  revalidate: 5000,
};

let num = 0;

export default function staticCmd(interaction: CommandInteraction) {
  num++;
  interaction.reply(\`I've been validated \${num} time\${num === 1 ? "" : "s"}!\`);
}
`;

      const env = `${
        !token ? "# Add your bot's token here\n" : ""
      }TOKEN="${token}"`;

      const deno = {
        imports: {
          "discord.js": "npm:discord.js",
          "@inbestigator/dext": "jsr:@inbestigator/dext",
        },
      };

      await Deno.mkdir(`./${projectName}`);
      await Deno.mkdir(`./${projectName}/src`);
      await Deno.mkdir(`./${projectName}/src/commands`);
      await Deno.mkdir(`./${projectName}/src/components`);
      await Deno.writeTextFile(`./${projectName}/README.md`, "");
      await Deno.writeTextFile(
        `./${projectName}/deno.json`,
        JSON.stringify(deno),
      );
      await Deno.writeTextFile(`./${projectName}/.env`, env);
      await Deno.writeTextFile(`./${projectName}/dext.config.ts`, config);
      await Deno.writeTextFile(
        `./${projectName}/src/commands/dynamic.ts`,
        dynamicCmd,
      );
      await Deno.writeTextFile(
        `./${projectName}/src/commands/static.ts`,
        staticCmd,
      );
    } catch {
      mkdirLoader.error();
      return;
    }
    mkdirLoader.resolve();

    console.log(
      `Project created successfully. Please run\n$ cd ${projectName}${
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
