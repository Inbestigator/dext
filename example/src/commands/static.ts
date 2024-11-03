import type { CommandInteraction } from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "Shows how a pregenerated command doesn't run every time",
  options: [],
  revalidate: 6000,
  pregenerated: true,
};

let num = 0;

export default async function staticCmd(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  num++;
  await interaction.editReply(
    `I've been validated ${num} time${num === 1 ? "" : "s"}!`,
  );
  await interaction.followUp({
    content: "It will only change every 6 seconds",
    ephemeral: true,
  });
}
