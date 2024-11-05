import type {
  Client,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import type { Component, DextConfig } from "../internal/types.ts";
import { join } from "node:path";
import { red, underline, yellow } from "@std/fmt/colors";
import loader from "../internal/loader.ts";
import createSpyInteraction, {
  type CachedResponse,
  type InteractionReply,
} from "../internal/spyInteraction.ts";
import type { ComponentConfig } from "../exports/config.ts";

async function validateAndCache<
  T extends MessageComponentInteraction | ModalSubmitInteraction,
>(component: Component, interaction: T, client: Client, expiry: number) {
  const cacheFilePath =
    `./.dext/components/${component.category}/${component.name}.json`;

  try {
    const { response, stamp } = JSON.parse(
      new TextDecoder().decode(Deno.readFileSync(cacheFilePath)),
    ) as { response: CachedResponse; stamp: number };

    if (
      Date.now() - stamp < (component.revalidate ?? expiry) &&
      response.reply
    ) {
      switch (typeof response.reply) {
        case "object":
          if ("modal" in response.reply && "showModal" in interaction) {
            await interaction.showModal(response.reply.data);
          } else if ("deferred" in response.reply && response.reply.deferred) {
            await interaction.deferReply({
              ephemeral: response.reply.ephemeral,
            });
          } else {
            await interaction.reply(response.reply as InteractionReply);
          }
          break;
        default:
          await interaction.reply(response.reply);
      }

      for (const followUp of response.followUps) {
        await interaction.followUp(followUp);
      }
      return;
    }
  } catch {
    // pass
  }

  const interactionMock = createSpyInteraction<T>(component, interaction);

  await Promise.resolve(component.default(interactionMock, client));

  Deno.writeTextFileSync(
    cacheFilePath,
    JSON.stringify({
      response: interactionMock.response(),
      stamp: Date.now(),
    }),
  );
}

export default async function setupComponents(
  client: Client,
  config: DextConfig,
) {
  const generatingLoader = loader(
    `${
      Deno.env.get("DEXT_ENV") !== "production" ? "Generating" : "Validating"
    } components`,
  );
  let generatedN = 0;
  const generatedStr: string[][] = [[underline("\nComponent")]];

  function sendType(
    name: string,
    category: string,
    isPregen: boolean,
    totalComponents: number,
  ) {
    generatedN++;
    generatedStr.push([
      totalComponents === 1
        ? "-"
        : generatedN === 1
        ? "┌"
        : totalComponents === generatedN
        ? "└"
        : "├",
      isPregen ? "○" : "ƒ",
      name + ` (${category})`,
    ]);
  }

  try {
    const components = await fetchComponents();

    try {
      await Deno.mkdir("./.dext/components", { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }

    const generatedResults = await Promise.all(
      components.map(async (component, i) => {
        const interactionMock = createSpyInteraction<
          MessageComponentInteraction
        >(component);

        try {
          const result = await Promise.resolve(
            component.default(interactionMock, client),
          );
          if (result instanceof Promise) {
            component.pregenerated = false;
          }
        } catch {
          // pass
        }

        const response = interactionMock.response();

        if (
          (response.reply === null && component.pregenerated !== true) ||
          component.pregenerated === false
        ) {
          sendType(
            component.name,
            component.category,
            false,
            components.length,
          );
          components[i].pregenerated = false;
          return false;
        }

        components[i].pregenerated = true;
        if (Deno.env.get("DEXT_ENV") === "production") return;
        sendType(component.name, component.category, true, components.length);
        Deno.writeTextFileSync(
          `./.dext/components/${component.category}/${component.name}.json`,
          JSON.stringify({
            response,
            stamp: Date.now(),
          }),
        );

        return true;
      }),
    );

    generatingLoader.resolve();

    if (Deno.env.get("DEXT_ENV") !== "production") {
      console.log(generatedStr.map((row) => row.join(" ")).join("\n"));
      console.info(
        `\n${
          generatedResults.includes(true)
            ? "\n○  (Static)  preran as static responses"
            : ""
        }${
          generatedResults.includes(false)
            ? "\nƒ  (Dynamic)  re-evaluated every interaction"
            : ""
        }`,
      );
    }

    client.on(
      "interactionCreate",
      (interaction) =>
        void (async () => {
          if (
            !interaction.isMessageComponent() &&
            !interaction.isModalSubmit()
          ) {
            return;
          }
          const category = interaction.isButton()
            ? "buttons"
            : interaction.isAnySelectMenu()
            ? "selects"
            : interaction.isModalSubmit()
            ? "modals"
            : undefined;

          if (!category) {
            return;
          }

          const component = components.find(
            (c) => c.name === interaction.customId && c.category === category,
          );

          if (!component) {
            return;
          }

          const componentLoader = loader(
            `Running component "${component.name}"`,
          );

          try {
            if (component.pregenerated === true) {
              await validateAndCache(
                component,
                interaction,
                client,
                config.cacheExpiry ?? 24 * 60 * 60 * 1000,
              );
            } else {
              await component.default(interaction, client);
            }
            componentLoader.resolve();
          } catch (error) {
            componentLoader.error();
            console.error(
              ` ${red("✖")} Error running component "${component.name}":`,
              error,
            );
          }
        })(),
    );
  } catch (e) {
    generatingLoader.error();
    console.error(e);
    Deno.exit(1);
  }
}

const validComponentCategories = ["buttons", "modals", "selects"];

async function fetchComponents() {
  try {
    Deno.readDirSync("./src/components");
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.warn(` ${yellow("!")} src/components directory not found`);
    }
    return [];
  }

  const presentCategories = [];

  for (const category of validComponentCategories) {
    try {
      Deno.readDirSync("./src/components/" + category);
      presentCategories.push(category);
      Deno.mkdirSync("./.dext/components/" + category, { recursive: true });
    } catch {
      // pass
    }
  }

  const componentNames = readdir("./src/components");
  const componentData: Component[] = [];

  for (const componentName of componentNames) {
    const componentModule = (await import(componentName)) as {
      config?: ComponentConfig;
      default: (
        interaction: MessageComponentInteraction | ModalSubmitInteraction,
        client: Client,
      ) => unknown;
    };

    const category = componentName
      .split(join(Deno.cwd(), "src/components/"))[1]
      .split(/[\\\/]/)[0];

    if (!validComponentCategories.includes(category)) {
      console.warn(
        ` ${
          yellow(
            "!",
          )
        } Category for "${componentName}" could not be determined, skipping`,
      );
      continue;
    }

    const component: Component = {
      name: componentName
        .split(/[\\\/]/)
        .pop()!
        .split(".")[0],
      category: category as "buttons" | "modals" | "selects",
      pregenerated: componentModule.config?.pregenerated,
      revalidate: componentModule.config?.revalidate,
      default: componentModule.default,
    };

    if (
      componentData.find(
        (c) => c.name === component.name && c.category === category,
      )
    ) {
      console.warn(
        ` ${yellow("!")} ${
          component.category.slice(0, 1).toUpperCase() +
          component.category.split("s")[0].slice(1)
        } component "${component.name}" already exists, skipping the duplicate`,
      );
      continue;
    }

    componentData.push(component);
  }

  return componentData;
}

function readdir(path: string) {
  const files = Deno.readDirSync(path);
  const components: string[] = [];
  for (const file of files) {
    if (file.isDirectory) {
      components.push(...readdir(join(path, file.name)));
    }
    if (file.name.endsWith(".ts") && file.isFile) {
      components.push(join("file://", Deno.cwd(), path, file.name));
    }
  }
  return components;
}
