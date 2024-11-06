import type { Client, CommandInteraction } from "discord.js";
import type { Command, DextConfig } from "../internal/types.ts";
import { join } from "node:path";
import { red, underline, yellow } from "@std/fmt/colors";
import loader from "../internal/loader.ts";
import type { CommandConfig } from "../exports/config.ts";
import createSpyInteraction from "../internal/spyInteraction.ts";
import { validateAndCache } from "../internal/validate.ts";

export default async function setupCommands(
  client: Client,
  config: DextConfig,
) {
  const generatingLoader = loader(
    `${
      Deno.env.get("DEXT_ENV") !== "production" ? "Generating" : "Validating"
    } commands`,
  );
  let generatedN = 0;
  const generatedStr: string[][] = [[underline("\nCommand")]];

  function sendType(name: string, isPregen: boolean, totalCommands: number) {
    generatedN++;
    generatedStr.push([
      totalCommands === 1
        ? "-"
        : generatedN === 1
        ? "┌"
        : totalCommands === generatedN
        ? "└"
        : "├",
      isPregen ? "○" : "ƒ",
      name,
    ]);
  }

  try {
    const commands = await fetchCommands();

    if (Deno.env.get("DEXT_ENV") !== "build") {
      await client.application?.commands.set(commands);
    }

    try {
      await Deno.mkdir("./.dext/commands", { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }

    const generatedResults = await Promise.all(
      commands.map(async (command, i) => {
        const interactionMock = createSpyInteraction<CommandInteraction>(
          command,
        );

        try {
          const result = command.default(interactionMock, client);
          if (result instanceof Promise) {
            await result;
            command.pregenerated = false;
          }
        } catch {
          // pass
        }

        const response = interactionMock.response();

        if (
          (response.reply === null && command.pregenerated !== true) ||
          command.pregenerated === false
        ) {
          sendType(command.name, false, commands.length);
          commands[i].pregenerated = false;
          return false;
        }

        commands[i].pregenerated = true;
        if (Deno.env.get("DEXT_ENV") === "production") return;

        sendType(command.name, true, commands.length);
        Deno.writeTextFileSync(
          `./.dext/commands/${command.name}.json`,
          JSON.stringify({
            response,
            stamp: Date.now(),
          }),
        );

        return true;
      }),
    );

    generatingLoader.resolve();

    if (Deno.env.get("DEXT_ENV") !== "production") {
      console.log(generatedStr.map((row) => row.join(" ")).join("\n"));
      console.info(
        `\n${
          generatedResults.includes(true)
            ? "\n○  (Static)  preran as static responses"
            : ""
        }${
          generatedResults.includes(false)
            ? "\nƒ  (Dynamic)  re-evaluated every interaction"
            : ""
        }`,
      );
    }

    client.on(
      "interactionCreate",
      (interaction) =>
        void (async () => {
          if (!interaction.isCommand()) return;

          const command = commands.find(
            (c) => c.name === interaction.commandName,
          );

          if (!command) {
            return;
          }
          const commandLoader = loader(`Running command "${command?.name}"`);

          try {
            if (command.pregenerated === true) {
              await validateAndCache(
                command,
                interaction,
                client,
                config.cacheExpiry ?? 24 * 60 * 60,
              );
            } else {
              await command.default(interaction, client);
            }
            commandLoader.resolve();
          } catch (error) {
            commandLoader.error();
            console.error(
              ` ${red("✖")}Error running command "${command?.name}":`,
              error,
            );
          }
        })(),
    );
  } catch (e) {
    generatingLoader.error();
    console.error(e);
    Deno.exit(1);
  }
}

async function fetchCommands() {
  const commandNames = readdir("./src/commands");
  const commandData: Command[] = [];

  for (const commandName of commandNames) {
    const commandModule = (await import(commandName)) as {
      config?: CommandConfig;
      default: (interaction: CommandInteraction, client: Client) => unknown;
    };
    const command: Command = {
      name: commandName
        .split(/[\\\/]/)
        .pop()!
        .split(".")[0],
      description: commandModule.config?.description ??
        "No description provided",
      options: commandModule.config?.options ?? [],
      pregenerated: commandModule.config?.pregenerated,
      revalidate: commandModule.config?.revalidate,
      default: commandModule.default,
    };

    if (commandData.find((c) => c.name === command.name)) {
      console.warn(
        ` ${
          yellow("!")
        } Command "${command.name}" already exists, skipping the duplicate`,
      );
      continue;
    }

    commandData.push(command);
  }

  return commandData;
}

function readdir(path: string) {
  let files;

  try {
    files = Deno.readDirSync(path);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.warn(` ${yellow("!")} src/commands directory not found`);
    }
    return [];
  }
  const commands: string[] = [];
  for (const file of files) {
    if (file.isDirectory) {
      commands.push(...readdir(join(path, file.name)));
    }
    if (file.name.endsWith(".ts") && file.isFile) {
      commands.push(join("file://", Deno.cwd(), path, file.name));
    }
  }
  return commands;
}
