# Components

Components can either be statically generated at buildtime (and whenever
revalidated), or be dynamic, which is the traditional method of running
components.

## Components ids

The command ids are determined by their file name, here's a typical component
structure:

```plaintext
src
├── components
│       └── buttons
│           ├── static.ts // Will have id static
│           └── dynamic.ts // Will have id dynamic
```

This means that command file names must be unique within their category.

The component categories available are buttons, selects, and modals

## Component execution

All components are required to have a default export, this function is exactly
how a typical Discord.js command would usually be handled.

```ts
import type { Client, MessageComponentInteraction } from "discord.js";

export default function myButton(
  interaction: MessageComponentInteraction,
  _client: Client,
) {
  interaction.reply("Hi there!");
}
```
