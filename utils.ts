import { dirname, join } from "jsr:@std/path@1.1.1";
import { stringify } from "jsr:@std/yaml@1.0.9";
import { Blowfish } from "npm:egoroof-blowfish";
import type { Secret } from "npm:@infisical/sdk";

const INFISICAL_CONFIG_NAME = ".infisical.json";
export const loadInfisicalConfig = async () => {
  let dir = Deno.cwd();
  while (true) {
    const candidate = join(dir, INFISICAL_CONFIG_NAME);
    try {
      if ((await Deno.stat(candidate)).isFile) {
        const text = await Deno.readTextFile(candidate);
        return JSON.parse(text);
      }
    } catch {
      /* Continue */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.error(
    `${INFISICAL_CONFIG_NAME} does not exist. Please add the required configuration file.`,
  );
  Deno.exit(1);
};

const ROOT_IDENTIFIER_FILE = "pom.xml";
export const getRootDir = async () => {
  let dir = Deno.cwd();
  while (true) {
    const candidate = join(dir, ROOT_IDENTIFIER_FILE);
    try {
      if ((await Deno.stat(candidate)).isFile) {
        return dir;
      }
    } catch {
      /* Continue */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.error(
    `${ROOT_IDENTIFIER_FILE} does not exist. Please run inside a mulesoft project`,
  );
  Deno.exit(1);
};

export const yamlifySecrets = (secrets: Secret[]) => {
  // Get Encryption Key
  const encryptKeySecret = secrets.find(
    (s) =>
      (!s.secretPath || s.secretPath === "/") && s.secretKey === "encrypt.key",
  );
  const key = encryptKeySecret?.secretValue;
  if (!key) {
    console.error(
      'Error: Infisical vault must have a secret labeled "encrypt.key" in the root directory to encrypt values. Exiting...',
    );
    Deno.exit(1);
  }
  // Build Object
  const root: Record<string, unknown> = {};
  for (const s of secrets.filter((s) => s !== encryptKeySecret)) {
    const parts = s.secretPath?.split("/").filter(Boolean);
    if (parts) {
      let node = root;
      for (const p of parts) {
        if (typeof node[p] !== "object" || node[p] === null) node[p] = {};
        node = node[p] as Record<string, unknown>;
      }
      node[s.secretKey] = encryptValue(s.secretValue, key);
    } else {
      root[s.secretKey] = encryptValue(s.secretValue, key);
    }
  }
  return { key, yaml: stringify(root) };
};

const encryptValue = (secret: string, key: string) => {
  const bf = new Blowfish(key, Blowfish.MODE.CBC, Blowfish.PADDING.PKCS5);
  const keyBytes = new TextEncoder().encode(key);
  const iv = new Uint8Array(8);
  iv.set(keyBytes.subarray(0, 8));
  bf.setIv(iv);
  return `![${btoa(String.fromCharCode(...bf.encode(secret)))}]`;
};

export const writeEnsuringDir = async (
  rootDir: string,
  files: { path: string; text: string }[],
) => {
  for (const file of files) {
    const path = join(rootDir, file.path);
    await Deno.mkdir(dirname(path), { recursive: true });
    await Deno.writeTextFile(path, file.text);
  }
};

export const getInfisicalDomain = async () => {
  const home = Deno.build.os === "windows"
    ? Deno.env.get("USERPROFILE")
    : Deno.env.get("HOME");

  if (!home) throw new Error("Cannot resolve home directory");
  const config = JSON.parse(
    await Deno.readTextFile(join(home, ".infisical", "infisical-config.json")),
  );
  if (config.LoggedInUserDomain) {
    return config.LoggedInUserDomain.split("/api")[0];
  } else {
    console.error(
      "Cannot find infisical-config.json file with logged in user domain. Ensure you are logged in to Infisical.",
    );
    Deno.exit(1);
  }
};
