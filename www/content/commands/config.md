# Command Config

Each command can optionally export a `config` object.

```ts
import type { CommandConfig } from "@inbestigator/dext";

export const config: CommandConfig = {
  description: "Send a random adorable animal photo",
  options: [
    {
      name: "animal",
      description: "The type of animal",
      type: 3,
      required: true,
    },
  ],
  revalidate: 5,
  pregenerated: true,
};
```

## Config type

### Description - _string_

A description is the only required part of a command config, it just sets the
command description when running it in Discord.

### Options - _array_

Options is an array of
[Discord application command options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)

### Revalidate - _number_

The revalidate value is how long (in seconds) Dext should allow before
revalidating (actually running) the command again.

**Notes:**

- A command will not actually be revalidated until it is called again
- Revalidate overrides the `cacheExpiry` value in your Dext config

### Pregenerated - _boolean_

Pregenerated will override Dext's decision on whether a command is static or
not, this is good for if you want to make an asynchronous command be statically
generated.

`true` - force static

`false` - force dynamic

To learn more about static vs dynamic commands, see
[this page](/docs/commands/static-commands).
