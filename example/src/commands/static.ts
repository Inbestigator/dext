import type { CommandInteraction } from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "Shows how a pregenerated command doesn't run every time",
  options: [],
  revalidate: 6000,
};

let num = 0;

export default function staticCmd(interaction: CommandInteraction) {
  num++;
  interaction.reply({
    content: `I've been validated ${num} time${num === 1 ? "" : "s"}!`,
    ephemeral: true,
  });
}
