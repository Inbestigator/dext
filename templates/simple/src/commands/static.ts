import type { CommandInteraction } from "discord.js";
import type { CommandConfig } from "@inbestigator/dext";

export const config: CommandConfig = {
  description: "Shows how a pregenerated command doesn't run every time",
  revalidate: 5,
};

let num = 0;
export default function staticCmd(interaction: CommandInteraction) {
  num++;

  interaction.reply({
    content: `I've been validated ${num} time${num === 1 ? "" : "s"}!`,
    ephemeral: true,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            customId: "static",
            style: 1,
            label: "Wow!",
          },
        ],
      },
    ],
  });
}
