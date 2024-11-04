import { type Client, Events } from "discord.js";
import { join } from "node:path";
import loader from "../internal/loader.ts";

export default async function setupEvents(client: Client) {
  const loadingLoader = loader("Loading events");

  try {
    try {
      Deno.readDirSync("./src/events");
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        console.warn(" \x1b[33m!\x1b[0m", `src/events directory not found`);
      }
      return [];
    }

    await readdir("./src/events");
    loadingLoader.resolve();
  } catch (e) {
    loadingLoader.error();
    console.error(e);
    Deno.exit(1);
  }

  async function readdir(path: string) {
    const files = Deno.readDirSync(path);
    const events: string[] = [];
    for (const file of files) {
      if (file.isDirectory) {
        events.push(...(await readdir(join(path, file.name))));
      }
      const title = file.name.split("/").pop()!.split(".")[0];
      if (file.name.endsWith(".ts") && file.isFile && title in Events) {
        const eventModule = (await import(
          join("file://", Deno.cwd(), path, file.name)
        )) as {
          default: (client: Client, ...args: unknown[]) => unknown;
        };
        client.on(
          (Events as Record<string, string>)[title],
          async (...args) => {
            const eventLoader = loader(`Running event "${title}"`);
            try {
              await Promise.resolve(eventModule.default(client, ...args));
              eventLoader.resolve();
            } catch (e) {
              eventLoader.error();
              console.error("Error running event:", e);
            }
          },
        );
      }
    }
    return events;
  }
}
