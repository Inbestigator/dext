import type { DextConfig } from "@inbestigator/dext";
import createInstance from "../lib/main.ts";

createInstance();

const config: DextConfig = {
  client: { intents: [] },
  clientId: "",
  cacheExpiry: 60000,
};

export default config;
