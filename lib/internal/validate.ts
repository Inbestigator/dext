import type {
  Client,
  CommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import type { Command, Component } from "./types.ts";
import type { CachedResponse, InteractionReply } from "./spyInteraction.ts";
import createSpyInteraction from "./spyInteraction.ts";

export async function validateAndCache<
  T extends
    | CommandInteraction
    | MessageComponentInteraction
    | ModalSubmitInteraction,
>(item: Command | Component, interaction: T, client: Client, expiry: number) {
  const cacheFilePath = "category" in item
    ? `./.dext/components/${item.category}/${item.name}.json`
    : `./.dext/commands/${item.name}.json`;

  try {
    const { response, stamp } = JSON.parse(
      new TextDecoder().decode(Deno.readFileSync(cacheFilePath)),
    ) as { response: CachedResponse; stamp: number };

    if (
      Date.now() - stamp < (item.revalidate ?? expiry) * 1000 &&
      response.reply
    ) {
      switch (typeof response.reply) {
        case "object":
          if ("modal" in response.reply && "showModal" in interaction) {
            await interaction.showModal(response.reply.data);
          } else if ("deferred" in response.reply && response.reply.deferred) {
            await interaction.deferReply({
              ephemeral: response.reply.ephemeral,
            });
          } else {
            await interaction.reply(response.reply as InteractionReply);
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

  const interactionMock = createSpyInteraction<T>(item, interaction);

  // deno-lint-ignore no-explicit-any
  await Promise.resolve(item.default(interactionMock as any, client));

  Deno.writeTextFileSync(
    cacheFilePath,
    JSON.stringify({
      response: interactionMock.response(),
      stamp: Date.now(),
    }),
  );
}
