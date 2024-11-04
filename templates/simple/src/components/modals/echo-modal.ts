import type { ModalSubmitInteraction } from "discord.js";

export default function echoModal(interaction: ModalSubmitInteraction) {
  interaction.reply({
    content: interaction.fields.getTextInputValue("echo"),
  });
}
