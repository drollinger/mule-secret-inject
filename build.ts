import { basename, dirname, join } from "@std/path";
import type { cmdBuild } from "./command.ts";
import {
  CWD,
  ENCRYPT_PATH,
  getFilesToWrite,
  getFinalConfiguration,
  removeSecretsFiles,
  TARGET_PATH,
  writeEnsuringDir,
} from "./utils.ts";

export const build = async (
  options: Parameters<Parameters<typeof cmdBuild.action>[0]>[0],
) => {
  // Get files first to ensure the program doesn't exit on any issues
  const filesToWrite = await getFilesToWrite(options);

  // Remove all existing secrets files
  const deletedFiles = await removeSecretsFiles();

  // Write all new secrets files except the encrypt file
  await writeEnsuringDir(
    filesToWrite.filter((file) => file.path !== ENCRYPT_PATH),
  );

  if (options.manual) {
    console.log("Files configured to manually build");
    prompt("Waiting... (Press enter after building in Anypoint)");
  } else {
    try {
      console.log("Building jar...");
      const cmd = new Deno.Command("mvn", {
        args: ["clean", "package"],
        cwd: CWD,
      });
      await cmd.output();
    } catch (e) {
      console.log("mvn clean package threw error => " + e);
      console.log("Restoring original secrets");
      await removeSecretsFiles();
      await writeEnsuringDir(deletedFiles);
      Deno.exit(1);
    }
    let wroteNewJar = false;
    for await (const e of Deno.readDir(TARGET_PATH)) {
      if (e.isFile && e.name.endsWith(".jar")) {
        const { environment } = await getFinalConfiguration(options);
        const newJarName = `${basename(CWD)}-${
          options.allEnv ? "all" : environment
        }.jar`;
        let fullFilePath: string;
        if (options.output) {
          fullFilePath = (
            options.output.endsWith("/")
              ? join(TARGET_PATH, options.output, newJarName)
              : join(TARGET_PATH, options.output)
          ).replaceAll("{e}", environment);
          await Deno.mkdir(dirname(fullFilePath), { recursive: true });
        } else {
          fullFilePath = join(TARGET_PATH, newJarName).replaceAll(
            "{e}",
            environment,
          );
        }
        await Deno.rename(join(TARGET_PATH, e.name), fullFilePath);
        console.log(`Jar file saved to ${fullFilePath}`);
        wroteNewJar = true;
        break;
      }
    }
    if (!wroteNewJar) {
      console.log("Could not find output jar from mvn clean package!");
    }
  }
  console.log("Restoring original secrets");
  await removeSecretsFiles();
  await writeEnsuringDir(deletedFiles);
};
