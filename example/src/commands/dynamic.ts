import type { CommandInteraction } from "discord.js";

export default function dynamicCmd(interaction: CommandInteraction) {
  interaction.reply("Hey there, " + interaction.user.displayName + "!");
}
