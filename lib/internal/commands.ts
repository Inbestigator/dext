import type {
  Client,
  CommandInteraction,
  InteractionReplyOptions,
} from "discord.js";
import type { Command, DextConfig } from "./types.ts";
import { join } from "node:path";
import { underline } from "@std/fmt/colors";
import loader from "./loader.ts";
import type { CommandData } from "../exports.ts";

interface InteractionMock extends CommandInteraction {
  // deno-lint-ignore no-explicit-any
  reply: (options: InteractionReplyOptions & { fetchReply: true }) => any;
  response: InteractionReplyOptions | null;
}

function createInteractionMock(command: Command): InteractionMock {
  let response: InteractionReplyOptions | null = null;

  const handler = {
    get(target: InteractionMock, prop: string) {
      switch (prop) {
        case "response":
          return response;
        case "reply":
          return target.reply;
        case "showModal":
          return target.showModal;
        default:
          if (command.pregenerated !== true) {
            throw new Error();
          } else {
            console.warn(
              " \x1b[33m!\x1b[0m",
              `Explicitly static command "${command.name}" tries to access dynamic property "${prop}"`
            );
            return false;
          }
      }
    },
  };

  const mock = {
    reply: (options) => {
      response = options;
    },
  } as InteractionMock;

  return new Proxy(mock, handler);
}

async function validateAndCache(
  command: Command,
  interaction: CommandInteraction,
  client: Client,
  expiry: number
) {
  const cacheFilePath = `./.dext/commands/${command.name}.json`;

  try {
    const { response, stamp } = JSON.parse(
      new TextDecoder().decode(Deno.readFileSync(cacheFilePath))
    );

    if (Date.now() - stamp < (command.revalidate ?? expiry)) {
      interaction.reply(response);
      return;
    }
  } catch {
    // pass
  }

  const originalReply = interaction.reply;
  let response: string = "";

  // @ts-expect-error Weird error
  interaction.reply = (options: InteractionReplyOptions) => {
    response = JSON.stringify(options);
    return originalReply.apply(interaction, [options]);
  };

  await command.default(interaction, client);

  if (response) {
    Deno.writeTextFileSync(
      cacheFilePath,
      JSON.stringify({
        response,
        stamp: Date.now(),
      })
    );
  }
}

export default async function setupCommands(
  client: Client,
  config: DextConfig
) {
  const commands = await fetchCommands();

  await client.application?.commands.set(commands);

  const generatingLoader = loader("Generating commands");

  try {
    await Deno.mkdir("./.dext/commands");
  } catch (err) {
    if (!(err instanceof Deno.errors.AlreadyExists)) {
      throw err;
    }
  }

  const totalCommands = commands.length;
  let generatedN = 0;
  const generatedStr: string[][] = [[underline("\nCommand")]];

  function sendType(name: string, isPregen: boolean) {
    generatedN++;
    generatedStr.push([
      generatedN === 1 ? "┌" : totalCommands === generatedN ? "└" : "├",
      isPregen ? "○" : "ƒ",
      name,
    ]);
  }
  const generatedResults = await Promise.all(
    commands.map(async (command, i) => {
      const interactionMock = createInteractionMock(command);

      try {
        const result = await Promise.resolve(
          command.default(interactionMock, client)
        );
        if (result instanceof Promise) {
          throw new Error();
        }
      } catch {
        // pass
      }

      const response = interactionMock.response;

      if (
        (!response && command.pregenerated !== true) ||
        command.pregenerated === false
      ) {
        sendType(command.name, false);
        commands[i].pregenerated = false;
        return false;
      }

      sendType(command.name, true);
      Deno.writeTextFileSync(
        `./.dext/commands/${command.name}.json`,
        JSON.stringify({
          response,
          stamp: Date.now(),
        })
      );
      commands[i].pregenerated = true;

      return true;
    })
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
    }`
  );

  client.on(
    "interactionCreate",
    (interaction) =>
      void (async () => {
        if (!interaction.isCommand()) return;

        const command = commands.find(
          (c) => c.name === interaction.commandName
        );

        if (!command) {
          return;
        }

        try {
          if (command.pregenerated === true) {
            await validateAndCache(
              command,
              interaction,
              client,
              config.cacheExpiry ?? 24 * 60 * 60 * 1000
            );
          } else {
            await command.default(interaction, client);
          }
        } catch (error) {
          console.error(`Failed to run command "${command.name}":`, error);
        }
      })()
  );
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
      description:
        commandModule.config?.description ?? "No description provided",
      options: commandModule.config?.options ?? [],
      pregenerated: commandModule.config?.pregenerated,
      revalidate: commandModule.config?.revalidate,
      default: commandModule.default,
    };

    commandData.push(command);
  }

  return commandData;
}

function readdir(path: string) {
  const files = Deno.readDirSync(path);
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
