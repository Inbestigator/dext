import type { CommandInteraction } from "discord.js";
import { CommandData } from "../../../lib/exports.ts";

export const config: CommandData = {
  description: "Shows how a pregenerated command doesn't run every time",
  options: [],
  revalidate: 6000,
};

let num = 0;

export default function staticCmd(interaction: CommandInteraction) {
  num++;
  interaction.reply({
    content: `I've been validated ${num} times!`,
    ephemeral: true,
  });
}
