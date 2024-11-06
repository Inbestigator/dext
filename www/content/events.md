# Events

All events are dynamic. The event that will trigger an event script is
determined by it's file name.

Valid event names are from the
[Discord.js Event enum](https://discord.js.org/docs/packages/discord.js/14.14.1/Events:Enum)

```plaintext
src
├── events
│       └── MessageCreate.ts
```

## Event execution

Events are executed from their default export.

```ts
import type { Client, Message } from "discord.js";

export default function messageCreate(_client: Client, message: Message) {
  if (message.author.bot) return;
  message.reply("Hi there!");
}
```
