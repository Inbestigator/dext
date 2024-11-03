import type {
  // @ts-ignore Type not found
  APIModalInteractionResponseCallbackData,
  CommandInteraction,
  InteractionReplyOptions,
  // @ts-ignore Type not found
  JSONEncodable,
  MessageComponentInteraction,
  ModalComponentData,
} from "discord.js";
import type { Command, Component } from "./types.ts";

const allValidResponses = [
  "reply",
  "deferReply",
  "deleteReply",
  "editReply",
  "followUp",
  "showModal",
] as const;
type ValidResponse = (typeof allValidResponses)[number];

type InteractionReply = string | InteractionReplyOptions;

export interface CachedResponse {
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

export default function createSpyInteraction<
  T extends CommandInteraction | MessageComponentInteraction,
>(item: Command | Component, interaction?: T) {
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
          actions.push({
            type: prop as ValidResponse,
            data,
          });
          if (!interaction) {
            return () => {};
          }
          return (
            interaction[prop as ValidResponse] as (data: unknown) => unknown
          ).apply(interaction, [data]);
        };
      } else {
        if (item.pregenerated !== true) {
          throw new Error();
        } else {
          console.warn(
            " \x1b[33m!\x1b[0m",
            `Explicitly static ${
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
  } as T & { response: () => CachedResponse };

  return new Proxy(mock, handler);
}
