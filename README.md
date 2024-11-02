# Dext

Compile Discord.js commands at build time.

```ts
import type { CommandInteraction } from "discord.js";
import type { CommandData } from "@inbestigator/dext";

export const config: CommandData = {
  description: "I will only change every 6 seconds",
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
```
