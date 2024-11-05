import type {
  CommandInteraction,
  InteractionReplyOptions,
  MessageComponentInteraction,
  ModalComponentData,
  ModalSubmitInteraction,
} from "discord.js";
import type { Command, Component } from "./types.ts";
import { yellow } from "@std/fmt/colors";

export type InteractionReply = string | InteractionReplyOptions;

export interface CachedResponse {
  reply:
    | InteractionReply
    | null
    | {
      deferred: boolean;
      ephemeral?: boolean;
    }
    | {
      modal: boolean;
      data: ModalComponentData;
    };
  followUps: InteractionReply[];
}

export default function createSpyInteraction<
  T extends
    | CommandInteraction
    | MessageComponentInteraction
    | ModalSubmitInteraction,
>(item: Command | Component, interaction?: T) {
  const allValidResponses = [
    "reply",
    "deferReply",
    "deleteReply",
    "editReply",
    "followUp",
    "showModal",
  ] as const;

  type ValidResponse = (typeof allValidResponses)[number];

  const actions: {
    type: ValidResponse;
    data: unknown;
  }[] = [];

  const handler = {
    get(target: T & { response: () => CachedResponse }, prop: string) {
      if (prop === "response") {
        return target.response;
      }
      if (allValidResponses.includes(prop as ValidResponse)) {
        return (data: unknown) => {
          if (
            data &&
            typeof data === "object" &&
            "toJSON" in data &&
            typeof data.toJSON === "function"
          ) {
            data = data.toJSON();
          }
          actions.push({
            type: prop as ValidResponse,
            data: data,
          });
          if (!interaction) {
            return () => {};
          }

          const method = interaction[prop as keyof T];
          if (typeof method === "function") {
            return method.apply(interaction, [data]);
          }
        };
      } else {
        if (item.pregenerated !== true) {
          throw new Error();
        } else {
          console.warn(
            ` ${yellow("!")} Explicitly static ${
              "description" in item ? "command" : "component"
            } "${item.name}" tries to access dynamic property "${prop}"`,
          );
          return target[prop as keyof T] ?? false;
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
              !("modal" in finalActions.reply)
            ) {
              if ("deferred" in finalActions.reply) {
                finalActions.reply.deferred = false;
              }
              switch (typeof action.data) {
                case "string":
                  finalActions.reply = {
                    ...finalActions.reply,
                    content: action.data,
                  };
                  break;
                case "object":
                  finalActions.reply = {
                    ...finalActions.reply,
                    ...action.data,
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
              data: action.data as ModalComponentData,
            };
            break;
        }
      }
      return finalActions;
    },
  } as T & { response: () => CachedResponse };

  return new Proxy(mock, handler);
}
