# Commands

The way that Dext handles commands is different to other Discord.js projects.

They can either be statically generated at buildtime (and whenever revalidated),
or be dynamic, which is the traditional method of running commands.

## Command names

The command names are determined by their file name, here's a typical command
structure:

```plaintext
src
├── commands
│       ├── static.ts // Will become /static
│       └── dynamic.ts // Will become /dynamic
```

This means that command file names must be globally unique.

## Command execution

All commands are required to have a default export, this function is exactly how
a typical Discord.js command would usually be handled.

```ts
import type { Client, CommandInteraction } from "discord.js";

export default function myCommand(
  interaction: CommandInteraction,
  _client: Client,
) {
  interaction.reply("Hi there!");
}
```
