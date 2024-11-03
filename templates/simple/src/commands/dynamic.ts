import type { CommandInteraction } from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "Returns a greeting",
  options: [],
};

export default function dynamicCmd(interaction: CommandInteraction) {
  interaction.reply({
    content: `Hey there, ${interaction.user.displayName}!`,
    ephemeral: true,
  });
}
