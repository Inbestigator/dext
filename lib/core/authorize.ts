import type { Client } from "discord.js";
import loader from "../internal/loader.ts";

export default async function authorize(client: Client, token: string) {
  const authLoader = loader("Authorizing");
  try {
    await client.login(token);
    authLoader.resolve();
  } catch {
    authLoader.error();
    Deno.exit(1);
  }
}
