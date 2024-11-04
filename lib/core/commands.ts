import type { Client, CommandInteraction } from "discord.js";
import type { Command, DextConfig } from "../internal/types.ts";
import { join } from "node:path";
import { underline } from "@std/fmt/colors";
import loader from "../internal/loader.ts";
import type { CommandData } from "../exports.ts";
import createSpyInteraction, {
  type CachedResponse,
} from "../internal/spyInteraction.ts";

async function validateAndCache(
  command: Command,
  interaction: CommandInteraction,
  client: Client,
  expiry: number,
) {
  const cacheFilePath = `./.dext/commands/${command.name}.json`;

  try {
    const { response, stamp } = JSON.parse(
      new TextDecoder().decode(Deno.readFileSync(cacheFilePath)),
    ) as { response: CachedResponse; stamp: number };

    if (Date.now() - stamp < (command.revalidate ?? expiry) && response.reply) {
      switch (typeof response.reply) {
        case "object":
          if ("modal" in response.reply) {
            await interaction.showModal(response.reply.data);
          } else if ("deferred" in response.reply && response.reply.deferred) {
            await interaction.deferReply({
              ephemeral: response.reply.ephemeral,
            });
          } else {
            await interaction.reply(response.reply);
          }
          break;
        default:
          await interaction.reply(response.reply);
      }

      for (const followUp of response.followUps) {
        await interaction.followUp(followUp);
      }
      return;
    }
  } catch {
    // pass
  }

  const interactionMock = createSpyInteraction<CommandInteraction>(
    command,
    interaction,
  );

  await Promise.resolve(command.default(interactionMock, client));

  Deno.writeTextFileSync(
    cacheFilePath,
    JSON.stringify({
      response: interactionMock.response(),
      stamp: Date.now(),
    }),
  );
}

export default async function setupCommands(
  client: Client,
  config: DextConfig,
) {
  const generatingLoader = loader("Generating commands");
  let generatedN = 0;
  const generatedStr: string[][] = [[underline("\nCommand")]];

  function sendType(name: string, isPregen: boolean, totalCommands: number) {
    generatedN++;
    generatedStr.push([
      generatedN === 1 ? "┌" : totalCommands === generatedN ? "└" : "├",
      isPregen ? "○" : "ƒ",
      name,
    ]);
  }

  try {
    const commands = await fetchCommands();

    await client.application?.commands.set(commands);

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
          const result = await Promise.resolve(
            command.default(interactionMock, client),
          );
          if (result instanceof Promise) {
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

        sendType(command.name, true, commands.length);
        Deno.writeTextFileSync(
          `./.dext/commands/${command.name}.json`,
          JSON.stringify({
            response,
            stamp: Date.now(),
          }),
        );
        commands[i].pregenerated = true;

        return true;
      }),
    );

    generatingLoader.resolve();

    console.log(generatedStr.map((row) => row.join(" ")).join("\n"));
    console.info(
      `\n${
        generatedResults.includes(true)
          ? "\n○  (Static) preran as static responses"
          : ""
      }${
        generatedResults.includes(false)
          ? "\nƒ  (Dynamic)  re-evaluated every interaction"
          : ""
      }`,
    );

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
                config.cacheExpiry ?? 24 * 60 * 60 * 1000,
              );
            } else {
              await command.default(interaction, client);
            }
            commandLoader.resolve();
          } catch (error) {
            commandLoader.error();
            console.error(
              " \x1b[31m✕\x1b[0m",
              `Error running command "${command?.name}":`,
              error,
            );
          }
        })(),
    );
  } catch {
    generatingLoader.error();
    Deno.exit(1);
  }
}

async function fetchCommands() {
  const commandNames = readdir("./src/commands");
  const commandData: Command[] = [];

  for (const commandName of commandNames) {
    const commandModule = (await import(commandName)) as {
      config?: CommandData;
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
        " \x1b[33m!\x1b[0m",
        `Command "${command.name}" already exists, skipping the duplicate`,
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
      console.warn(" \x1b[33m!\x1b[0m", `src/commands directory not found`);
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
