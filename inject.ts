import { InfisicalSDK } from "npm:@infisical/sdk@4.0.4";
import { getToken } from "./keyring.ts";
import {
  ENCRYPT_PATH,
  getFinalConfiguration,
  getInfisicalDomain,
  getInfisicalEnvironments,
  getSecretsYamlPath,
  SECRETS_XML_PATH,
  SECRETS_YAML_PATH,
  writeEnsuringDir,
  yamlifySecrets,
} from "./utils.ts";
import {
  getEncryptKeyEnvironmentXML,
  getEncryptKeyXML,
  secretsEnvironmentXML,
  secretsXML,
} from "./fileText.ts";
import type { cmdInject } from "./command.ts";

export const inject = async (
  options: Parameters<Parameters<typeof cmdInject.action>[0]>[0]
) => {
  const client = new InfisicalSDK({
    siteUrl: await getInfisicalDomain(),
  });
  client.auth().accessToken(await getToken());
  const { projectId, environment } = await getFinalConfiguration(options);

  const environmentOptions = await getInfisicalEnvironments(projectId);

  if (options.allEnv) {
    let defaultEncryptKey: string | undefined;
    for (const e of environmentOptions) {
      const s = await client.secrets().listSecrets({
        environment: e,
        projectId,
        recursive: true,
      });
      // Get Encryption Key
      if (
        s.secrets.find(
          (sec) =>
            (!sec.secretPath || sec.secretPath === "/") &&
            sec.secretKey === "encrypt.key"
        )?.secretValue
      ) {
        const { key, yaml } = yamlifySecrets(s.secrets);
        if (e === environment) defaultEncryptKey = key;
        // Write the secret file
        await writeEnsuringDir([{ path: getSecretsYamlPath(e), text: yaml }]);
      } else {
        console.log(
          `encrypt.key not specified for "${e}" environment. Skipping...`
        );
      }
    }
    await writeEnsuringDir([
      {
        path: ENCRYPT_PATH,
        text: getEncryptKeyEnvironmentXML(defaultEncryptKey, environment),
      },
      { path: SECRETS_XML_PATH, text: secretsEnvironmentXML },
    ]);
  } else {
    // Check environment
    if (!environmentOptions.includes(environment)) {
      console.log(
        `Specified environment "${environment}" not included in options: ${environmentOptions}`
      );
      Deno.exit(1);
    }

    const s = await client.secrets().listSecrets({
      environment,
      projectId,
      recursive: true,
    });

    const { key, yaml } = yamlifySecrets(s.secrets);

    // Write the files
    await writeEnsuringDir([
      { path: ENCRYPT_PATH, text: getEncryptKeyXML(key) },
      { path: SECRETS_XML_PATH, text: secretsXML },
      { path: SECRETS_YAML_PATH, text: yaml },
    ]);
  }

  console.log("Files Written!");
  console.log(
    "Ensure you have imported 'Mule Secure Configuration Property Extension' from exchange in the palette"
  );
  console.log("You may need to refreash Anypoint to see any new files");
};
