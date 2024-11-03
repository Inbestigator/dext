import createInstance, { type DextConfig } from "@inbestigator/dext";

createInstance();

const config: DextConfig = {
  client: { intents: [] },
  clientId: "",
  cacheExpiry: 60000,
};

export default config;
