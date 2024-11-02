import {
  type Client,
  type CommandInteraction,
  type InteractionReplyOptions,
} from "discord.js";
import type { Command, DextConfig } from "./types.ts";
import { join } from "node:path";
import { underline } from "@std/fmt/colors";
import loader from "./loader.ts";

interface InteractionMock extends CommandInteraction {
  reply: (options: InteractionReplyOptions & { fetchReply: true }) => any;
  response: InteractionReplyOptions | null;
}

function createInteractionMock(): InteractionMock {
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
          throw new Error();
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

    if (Date.now() - stamp < expiry) {
      interaction.reply(response);
      return;
    }
  } catch {}

  const interactionMock = createInteractionMock();
  await command.default(interactionMock, client);

  if (interactionMock.response) {
    Deno.writeTextFileSync(
      cacheFilePath,
      JSON.stringify({
        response: interactionMock.response,
        stamp: Date.now(),
      })
    );
    interaction.reply(interactionMock.response);
  }
}

export default async function setupCommands(
  client: Client,
  config: DextConfig
) {
  const commands = await fetchCommands();
  client.once(
    "ready",
    () =>
      void (async () => {
        await client.application?.commands.set(commands);
      })()
  );
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
      const interactionMock = createInteractionMock();

      try {
        const result = await Promise.resolve(
          command.default(interactionMock, client)
        );
        if (result instanceof Promise) {
          throw new Error();
        }
      } catch {}

      const response = interactionMock.response;

      if (!response) {
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

        try {
          if (command?.pregenerated === true) {
            await validateAndCache(
              command,
              interaction,
              client,
              config.cacheExpiry
            );
          } else {
            await command?.default(interaction, client);
          }
        } catch (error) {
          console.error(`Failed to run command "${command?.name}":`, error);
        }
      })()
  );
}

async function fetchCommands() {
  const commandNames = readdir("./src/commands");
  const commandData: Command[] = [];

  for (const commandName of commandNames) {
    const commandModule = (await import(commandName)) as Command;
    const command: Command = {
      name: commandName
        .split(/[\\\/]/)
        .pop()!
        .split(".")[0],
      description: commandModule.description ?? "No description provided",
      options: commandModule.options ?? [],
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
