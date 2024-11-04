import type { Client } from "discord.js";
import loader from "../internal/loader.ts";

export default async function authorize(client: Client, token: string) {
  if (Deno.env.get("DEXT_ENV") !== "development") {
    return;
  }
  const authLoader = loader("Authorizing");
  try {
    await client.login(token);
    authLoader.resolve();
  } catch (e) {
    authLoader.error();
    console.error(e);
    Deno.exit(1);
  }
}
