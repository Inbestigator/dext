import type {
  // @ts-ignore Type not found
  APIModalInteractionResponseCallbackData,
  Client,
  CommandInteraction,
  InteractionReplyOptions,
  // @ts-ignore Type not found
  JSONEncodable,
  ModalComponentData,
} from "discord.js";
import type { Command, DextConfig } from "../internal/types.ts";
import { join } from "node:path";
import { underline } from "@std/fmt/colors";
import loader from "../internal/loader.ts";
import type { CommandData } from "../exports.ts";

type ValidResponse =
  | "reply"
  | "deferReply"
  | "deleteReply"
  | "editReply"
  | "followUp"
  | "showModal";

const validResponses: ValidResponse[] = [
  "reply",
  "deferReply",
  "deleteReply",
  "editReply",
  "followUp",
  "showModal",
];

type InteractionReply = string | InteractionReplyOptions;

interface CachedResponse {
  reply:
    | InteractionReply
    | null
    | {
      deferred: true;
      ephemeral?: boolean;
    }
    | {
      modal: true;
      data:
        | JSONEncodable<APIModalInteractionResponseCallbackData>
        | ModalComponentData
        | APIModalInteractionResponseCallbackData;
    };
  followUps: InteractionReply[];
}

interface InteractionMock extends CommandInteraction {
  response: () => CachedResponse;
}

function createInteractionMock(
  command: Command,
  interaction?: CommandInteraction,
): InteractionMock {
  const actions: {
    type: ValidResponse;
    data: unknown;
  }[] = [];

  const handler = {
    get(target: InteractionMock, prop: ValidResponse) {
      if ((prop as string) === "response") {
        return target.response;
      }
      if (validResponses.includes(prop)) {
        return (data: unknown) => {
          actions.push({
            type: prop,
            data,
          });
          if (!interaction) {
            return () => {};
          }
          return (interaction[prop] as (data: unknown) => unknown).apply(
            interaction,
            [data],
          );
        };
      } else {
        if (command.pregenerated !== true) {
          throw new Error();
        } else {
          console.warn(
            " \x1b[33m!\x1b[0m",
            `Explicitly static command "${command.name}" tries to access dynamic property "${prop}"`,
          );
          return target[prop] ?? false;
        }
      }
    },
  };

  const mock = {
    ...interaction,
    response: () => {
      const finalActions: CachedResponse = {
        reply: null,
        followUps: [],
      };
      for (const action of actions) {
        switch (action.type) {
          case "reply":
            finalActions.reply = action.data as InteractionReply;
            break;
          case "deferReply":
            finalActions.reply = {
              deferred: true,
              ...(action.data as { ephemeral?: boolean }),
            };
            break;
          case "deleteReply":
            finalActions.reply = null;
            break;
          case "editReply":
            if (
              finalActions.reply &&
              typeof finalActions.reply === "object" &&
              "deferred" in finalActions.reply
            ) {
              switch (typeof action.data) {
                case "string":
                  finalActions.reply = {
                    content: action.data,
                    ephemeral: finalActions.reply.ephemeral,
                  };
                  break;
                case "object":
                  finalActions.reply = {
                    ...action.data,
                    ephemeral: finalActions.reply.ephemeral,
                  };
                  break;
              }
              break;
            }
            finalActions.reply = action.data as InteractionReply;
            break;
          case "followUp":
            finalActions.followUps.push(action.data as InteractionReply);
            break;
          case "showModal":
            finalActions.reply = {
              modal: true,
              data: action.data as
                | JSONEncodable<APIModalInteractionResponseCallbackData>
                | ModalComponentData
                | APIModalInteractionResponseCallbackData,
            };
            break;
        }
      }
      return finalActions;
    },
  } as InteractionMock;

  return new Proxy(mock, handler);
}

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

  const interactionMock = createInteractionMock(command, interaction);

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
      await Deno.mkdir("./.dext/commands");
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }

    const generatedResults = await Promise.all(
      commands.map(async (command, i) => {
        const interactionMock = createInteractionMock(command);

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
