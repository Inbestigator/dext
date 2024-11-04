import loader from "./internal/loader.ts";
import { dirname, join } from "node:path";
import { Command } from "commander";
import createInstance from "./core/instance.ts";

const program = new Command();

program.name("dext").description("Compile Discord.js commands at build time.");

program
  .command("dev")
  .description("Starts the bot in development mode.")
  .action(async () => {
    Deno.env.set("DEXT_ENV", "development");
    await createInstance();
  });

program
  .command("build")
  .description("Build the bot's files in production mode.")
  .action(async () => {
    await createInstance();
  });

program
  .command("create-new")
  .description("Create a new Dext bootstrapped bot.")
  .argument("[name]", "Project name")
  .option("-t, --token <token>", "Bot token")
  .option("-s, --simple", "Use a simple template")
  .action((name, { token, simple }) => {
    if (!name) {
      name = prompt("Project name:");
    }
    if (!name) {
      console.log("Project name cannot be empty.");
      Deno.exit(1);
    }
    if (!token) {
      token = prompt("Bot token (optional in this process):");
    }
    if (simple === undefined) {
      simple = confirm("Do you want to use a simple template?");
    }
    const mkdirLoader = loader(`Creating files for project: ${name}`);

    async function createFiles(path: string, dest: string) {
      Deno.mkdirSync(dest, { recursive: true });
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const json = await response.json();
      if (Array.isArray(json)) {
        for (const file of json) {
          if (file.type === "dir") {
            createFiles(file.url, join(dest, file.name));
          } else {
            const fileRes = await fetch(file.download_url);
            if (!fileRes.ok) {
              throw new Error(fileRes.statusText);
            }
            let fileContents = await fileRes.text();
            let destPath = join(dest, file.name);
            if (file.name === ".env.example" && token) {
              fileContents = `TOKEN="${token}"`;
              destPath = join(dest, ".env");
            }
            Deno.mkdirSync(dirname(destPath), { recursive: true });
            Deno.writeTextFileSync(destPath, fileContents);
          }
        }
      }
    }

    try {
      const path = simple
        ? "https://api.github.com/repos/Inbestigator/dext/contents/templates/simple"
        : "https://api.github.com/repos/Inbestigator/dext/contents/templates/base";

      createFiles(path, join(Deno.cwd(), name));
    } catch {
      mkdirLoader.error();
      Deno.exit(1);
    }
    mkdirLoader.resolve();

    console.log(
      `Project created successfully. Please run\n$ cd ${name}${
        !token ? "\nAdd your bot's token to .env" : ""
      }\n$ dext dev`,
    );
  });

program.parse();
