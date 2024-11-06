# Component Config

Each component can optionally export a `config` object.

```ts
import type { ComponentConfig } from "@inbestigator/dext";

export const config: ComponentConfig = {
  revalidate: 30,
  pregenerated: true,
};
```

## Config type

### Revalidate - _number_

The revalidate value is how long (in seconds) Dext should allow before
revalidating (actually running) the component again.

**Notes:**

- A component will not actually be revalidated until it is called again
- Revalidate overrides the `cacheExpiry` value in your Dext config

### Pregenerated - _boolean_

Pregenerated will override Dext's decision on whether a component is static or
not, this is good for if you want to make an asynchronous component be
statically generated.

`true` - force static

`false` - force dynamic

To learn more about static vs dynamic component, see
[this page](/docs/static-vs-dynamic).
