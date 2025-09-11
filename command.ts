
import { Command } from "@cliffy/command";
import cfg from "./deno.json" with { type: "json" };
import { inject } from "./inject.ts";
import { build } from "./build.ts";

export const cmd = new Command()
  // Main command.
  .name("@usu/mule-secret-inject")
  .version(cfg.version)
  .description("CLI tool for integrating Mulesoft with Infisical")
  .globalOption("-e, --environment <environment>", "Infisical environment")
  .globalOption("-a, --all-env", "Inject all environments")
  .globalOption("-p, --project <id>", "Infisical project id");

// Inject secrets command
export const cmdInject = cmd
  .command("inject", "Inject secrets setup into project")
  .option("-g, --git-ignore", "Include .gitignore")
  .action(inject)

// Build jar command
export const cmdBuild = cmd
  .command("build", "Build jar export for Anypoint")
  .option("-m, --manual", `Waits for Anypoint export
* Use if you don't have mvn installed
* NOT YET IMPLEMENTED`)
  .option("-o, --output <filename:file>", `Name of output file
* Use {e} to add the environment
* Default: parentFolder-{e}.jar`)
  .action(build)
