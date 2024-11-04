import {
  ActionRowBuilder,
  ButtonBuilder,
  type CommandInteraction,
} from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "Shows how a pregenerated command doesn't run every time",
  options: [],
  revalidate: 5000,
};

let num = 0;
const wowButton = new ButtonBuilder()
  .setCustomId("static")
  .setLabel("Wow!")
  .setStyle(1);

export default function staticCmd(interaction: CommandInteraction) {
  num++;

  interaction.reply({
    content: `I've been validated ${num} time${num === 1 ? "" : "s"}!`,
    ephemeral: true,
    components: [
      new ActionRowBuilder<ButtonBuilder>({
        components: [wowButton],
      }),
    ],
  });
}
