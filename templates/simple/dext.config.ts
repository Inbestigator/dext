import type { DextConfig } from "@inbestigator/dext/config";

const config: DextConfig = {
  client: { intents: ["Guilds", "GuildMessages"] },
  clientId: "", // Recommended to replace with your bot's client ID
};

export default config;
