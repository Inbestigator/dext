# Dext

## About

Dext is a powerful [Discord.js](https://discord.js.org) framework that optimizes bot performance.

## Installation

```bash
# Manual
deno add jsr:@inbestigator/dext

# Automatic
deno run -A jsr:@inbestigator/dext/cmd create-new
```

## Example usage

Create a Discord.js bot bootstrapped with Dext

```bash
deno run -A jsr:@inbestigator/dext/cmd create-new
```

Add a slash command

```ts
// src/commands/static.ts

import type { CommandInteraction } from "discord.js";
import type { CommandConfig } from "@inbestigator/dext";

export const config: CommandConfig = {
  description: "I will only change every 5 seconds",
  revalidate: 5,
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

Finally, start your bot in development mode

```bash
deno task dext dev
```

## Links

- [Website](https://dext.vercel.app)
- [JSR](https://jsr.io/@inbestigator/dext)
- [GitHub](https://github.com/inbestigator/dext)
