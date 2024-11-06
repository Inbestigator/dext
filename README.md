# Dext

Dext autogenerates responses for static commands and components, optimizing bot
performance. It automatically handles slash command creation, event responses,
and is easy to use and integrate.

> [!NOTE]\
> To automagically create a Dext bootstrapped bot, run the command
>
> ```bash
> deno run -A jsr:@inbestigator/dext/cmd create-new
> ```

```ts
import type { CommandInteraction } from "discord.js";
import type { CommandConfig } from "@inbestigator/dext";

export const config: CommandConfig = {
  description: "I will only change every 6 seconds",
  options: [],
  revalidate: 6,
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
