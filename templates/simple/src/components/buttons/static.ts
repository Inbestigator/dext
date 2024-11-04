import type { MessageComponentInteraction } from "npm:discord.js";
import type { ComponentData } from "@inbestigator/dext";

export const config: ComponentData = {
  revalidate: 9999 * 60 * 60 * 1000,
};

export default function staticButton(interaction: MessageComponentInteraction) {
  interaction.showModal({
    customId: "echo-modal",
    title: "Echo Modal",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            customId: "echo",
            placeholder: "I'll repeat whatever you say",
            label: "Echo me",
            style: 1,
          },
        ],
      },
    ],
  });
}
