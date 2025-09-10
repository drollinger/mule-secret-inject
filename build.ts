import type { cmdBuild } from "./main.ts";

export const build = async (
  _options: Parameters<Parameters<typeof cmdBuild.action>[0]>[0]
) => {
  console.log("This is not yet implemented")
  // const encryptFileText = await readTextFileSafe(ENCRYPT_PATH);
  // if (encryptFileText) await Deno.remove(ENCRYPT_PATH);

  // const [envName] = Deno.args;
  // if (envName) {
  //   // Save old files to memory
  //   //"-Dproject.build.finalName=myapp"
  //   console.log(`Pulling environment ${envName} for build injection...`);
  //   const { key, yaml } = await getKeyAndYamlFromInfisical();
  //   // Write the files
  //   await writeEnsuringDir([
  //     { path: ENCRYPT_PATH, text: getEncryptKeyXML(key) },
  //     { path: SECRETS_XML_PATH, text: secretsXML },
  //     { path: SECRETS_YAML_PATH, text: yaml },
  //   ]);
  // } else {
  // }

  // const cmd = new Deno.Command("mvn", {
  //   args: ["-DjarName=myapp", "-Dclassifier=notherone", "clean", "package"],
  //   cwd: CWD,
  // });
  // const { code, stdout, stderr } = await cmd.output();

  // if (encryptFileText) await Deno.writeTextFile(ENCRYPT_PATH, encryptFileText);
};
