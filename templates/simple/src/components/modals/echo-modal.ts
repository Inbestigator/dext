import type { ModalSubmitInteraction } from "discord.js";
import type { ComponentData } from "@inbestigator/dext";

export const config: ComponentData = {};

export default function echoModal(interaction: ModalSubmitInteraction) {
  interaction.reply({
    content: interaction.fields.getTextInputValue("echo"),
  });
}
