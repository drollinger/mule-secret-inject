import { InfisicalSDK } from "npm:@infisical/sdk";
import { getFirstToken } from "./keyring.ts";
import {
  getInfisicalDomain,
  getRootDir,
  loadInfisicalConfig,
  writeEnsuringDir,
  yamlifySecrets,
} from "./utils.ts";
import { getEncryptKeyXML, muleExclude, secretsXML } from "./fileText.ts";

const token = JSON.parse(atob(await getFirstToken("infisical-cli")))?.JTWToken;

if (!token) {
  console.error("No JTWToken found in saved value to keyring");
  Deno.exit(1);
}

const client = new InfisicalSDK({
  siteUrl: await getInfisicalDomain(),
});

client.auth().accessToken(token);

const { workspaceId, defaultEnvironment } = await loadInfisicalConfig();
// const projectId = Deno.env.get("INFISICAL_PROJECT") ?? workspaceId;
// const environment = Deno.env.get("INFISICAL_ENVIRONMENT") ?? defaultEnvironment;
const projectId = workspaceId;
const environment = defaultEnvironment;

if (!projectId || !environment) {
  console.error("workspaceId and defaultEnvironment not defined. Exiting...");
  Deno.exit(1);
}

const s = await client.secrets().listSecrets({
  environment,
  projectId,
  recursive: true,
});

const { key, yaml } = yamlifySecrets(s.secrets);

// Write the files
await writeEnsuringDir(await getRootDir(), [
  { path: "_muleExclude", text: muleExclude },
  { path: "src/main/mule/encrypt.key.xml", text: getEncryptKeyXML(key) },
  { path: "src/main/mule/secrets.xml", text: secretsXML },
  { path: "src/main/resources/secrets.yaml", text: yaml },
]);

console.log("Files Written!");
console.log(
  "Ensure you have imported 'Mule Secure Configuration Property Extension' from exchange in the palette",
);
console.log("You may need to refreash to see any new files 🙄");
