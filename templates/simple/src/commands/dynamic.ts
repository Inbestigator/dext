import type { CommandInteraction } from "discord.js";
import type { CommandConfig } from "@inbestigator/dext";

export const config: CommandConfig = {
  description: "Returns a greeting",
};

export default function dynamicCmd(interaction: CommandInteraction) {
  interaction.reply({
    content: `Hey there, ${interaction.user.displayName}!`,
    ephemeral: true,
  });
}
