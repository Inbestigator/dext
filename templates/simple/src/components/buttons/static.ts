import {
  ActionRowBuilder,
  type MessageComponentInteraction,
  ModalBuilder,
  TextInputBuilder,
} from "discord.js";
import type { ComponentData } from "@inbestigator/dext";

export const config: ComponentData = {
  revalidate: 9999 * 60 * 60 * 1000,
};

export default function staticButton(interaction: MessageComponentInteraction) {
  const modal = new ModalBuilder()
    .setTitle(
      "The only dynamic part of this flow is the response from this modal",
    )
    .setCustomId("echo-modal")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>({
        components: [
          new TextInputBuilder()
            .setCustomId("echo")
            .setPlaceholder("I'll repeat whatever you say")
            .setLabel("Echo me")
            .setStyle(1),
        ],
      }),
    );
  interaction.showModal(modal);
}
