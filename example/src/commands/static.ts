import type { CommandInteraction } from "discord.js";
let num = 0;

export default function staticCmd(interaction: CommandInteraction) {
  num++;
  interaction.reply({
    content: `Pong! ${num}`,
    ephemeral: true,
    fetchReply: true,
  });
}
