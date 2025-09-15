import { InfisicalSDK, type Secret } from "@infisical/sdk";
import { dirname, join } from "@std/path";
import { stringify } from "@std/yaml";
import { Blowfish } from "egoroof-blowfish";
import { getToken } from "./keyring.ts";
import type { cmd } from "./command.ts";
import {
  getEncryptKeyEnvironmentXML,
  getEncryptKeyXML,
  secretsEnvironmentXML,
  secretsXML,
} from "./fileText.ts";

const INFISICAL_CONFIG_NAME = ".infisical.json";
export const findInfisicalConfigDir = async (startDir = Deno.cwd()) => {
  let dir = startDir;
  while (true) {
    try {
      const stat = await Deno.stat(join(dir, INFISICAL_CONFIG_NAME));
      if (stat.isFile) return dir; // return the directory
    } catch {
      /* Continue */
    }

    const parent = dirname(dir);
    if (parent === dir) break; // Break at root filesystem
    dir = parent;
  }
  console.error(
    `${INFISICAL_CONFIG_NAME} does not exist. Please add the required configuration file.`,
  );
  Deno.exit(1);
};
export const loadInfisicalConfig = async () => {
  const dir = await findInfisicalConfigDir();
  const text = await Deno.readTextFile(join(dir, INFISICAL_CONFIG_NAME));
  return JSON.parse(text);
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
  return { key, yaml: Object.keys(root).length > 0 ? stringify(root) : "" };
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
  files: { path: string; text: string }[],
) => {
  for (const file of files) {
    await Deno.mkdir(dirname(file.path), { recursive: true });
    await Deno.writeTextFile(file.path, file.text);
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

export const getKeyAndYamlFromInfisical = async () => {
  const token = await getToken();
  if (!token) {
    console.error("Infisical did not return a token!");
    Deno.exit(1);
  }
  const client = new InfisicalSDK({
    siteUrl: await getInfisicalDomain(),
  });
  client.auth().accessToken(token);
  const { workspaceId, defaultEnvironment } = await loadInfisicalConfig();
  const projectId = Deno.env.get("INFISICAL_PROJECT") ?? workspaceId;
  const environment = Deno.env.get("INFISICAL_ENVIRONMENT") ??
    defaultEnvironment;

  if (!projectId || !environment) {
    console.error("workspaceId and defaultEnvironment not defined. Exiting...");
    Deno.exit(1);
  }

  const s = await client.secrets().listSecrets({
    environment,
    projectId,
    recursive: true,
  });

  return yamlifySecrets(s.secrets);
};

export const readTextFileSafe = async (path: string) => {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return undefined;
  }
};

export const CWD = await findInfisicalConfigDir();
export const GITIGNORE_PATH = join(CWD, ".gitignore");
export const TARGET_PATH = join(CWD, "target");
export const ENCRYPT_PATH = join(CWD, "src/main/mule/encrypt.key.xml");
export const SECRETS_XML_PATH = join(CWD, "src/main/mule/secrets.xml");
export const RESOURCE_PATH = join(CWD, "src/main/resources");
export const SECRETS_YAML_PATH = join(RESOURCE_PATH, "secrets.yaml");
export const getSecretsYamlPath = (environment: string) =>
  join(RESOURCE_PATH, `secrets-${environment}.yaml`);

export const getInfisicalEnvironments = async (projectId: string) => {
  const resp = await fetch(
    `${await getInfisicalDomain()}/api/v1/workspace/${projectId}`,
    {
      headers: { Authorization: `Bearer ${await getToken()}` },
    },
  );
  const body = (await resp.json()) as
    | {
      workspace: {
        environments: {
          slug: string;
        }[];
      };
    }
    | {
      message: string;
    };
  if (!("workspace" in body)) {
    console.log(
      `Error listing available environments${
        "message" in body ? `: ${body.message}` : ""
      }`,
    );
    Deno.exit(1);
  }
  return body.workspace.environments.map((e) => e.slug);
};

export const getFinalConfiguration = async (
  options: Parameters<Parameters<typeof cmd.action>[0]>[0],
) => {
  const { workspaceId, defaultEnvironment } = await loadInfisicalConfig();
  const projectId = options.project ?? workspaceId;
  if (!projectId) {
    console.error("project/workspace Id not defined. Exiting...");
    Deno.exit(1);
  }
  const environment = options.environment ?? defaultEnvironment;
  if (!environment && !options.allEnv) {
    console.error("environment not defined. Exiting...");
    Deno.exit(1);
  }
  return { projectId, environment };
};

export const getFilesToWrite = async (
  options: Parameters<Parameters<typeof cmd.action>[0]>[0],
) => {
  const client = new InfisicalSDK({
    siteUrl: await getInfisicalDomain(),
  });
  client.auth().accessToken(await getToken());
  const { projectId, environment } = await getFinalConfiguration(options);

  const environmentOptions = await getInfisicalEnvironments(projectId);

  const filesToWrite: { path: string; text: string }[] = [];

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
            sec.secretKey === "encrypt.key",
        )?.secretValue
      ) {
        const { key, yaml } = yamlifySecrets(s.secrets);
        if (e === environment) defaultEncryptKey = key;
        filesToWrite.push({ path: getSecretsYamlPath(e), text: yaml });
      } else {
        console.log(
          `encrypt.key not specified for "${e}" environment. Skipping...`,
        );
      }
    }
    filesToWrite.push(
      ...[
        {
          path: ENCRYPT_PATH,
          text: getEncryptKeyEnvironmentXML(defaultEncryptKey, environment),
        },
        { path: SECRETS_XML_PATH, text: secretsEnvironmentXML },
      ],
    );
  } else {
    // Check environment
    if (!environmentOptions.includes(environment)) {
      console.log(
        `Specified environment "${environment}" not included in options: ${environmentOptions}`,
      );
      Deno.exit(1);
    }

    const s = await client.secrets().listSecrets({
      environment,
      projectId,
      recursive: true,
    });

    const { key, yaml } = yamlifySecrets(s.secrets);

    filesToWrite.push(
      ...[
        { path: ENCRYPT_PATH, text: getEncryptKeyXML(key) },
        { path: SECRETS_XML_PATH, text: secretsXML },
        { path: SECRETS_YAML_PATH, text: yaml },
      ],
    );
  }

  return filesToWrite;
};

export const removeSecretsFiles = async () => {
  const deletedFiles: { path: string; text: string }[] = [];

  const wildCardFilePaths: string[] = [];
  for await (const f of Deno.readDir(RESOURCE_PATH)) {
    if (f.isFile && /^secrets-.*\.yaml$/.test(f.name)) {
      wildCardFilePaths.push(join(RESOURCE_PATH, f.name));
    }
  }

  for (
    const path of [
      ENCRYPT_PATH,
      SECRETS_XML_PATH,
      SECRETS_YAML_PATH,
      ...wildCardFilePaths,
    ]
  ) {
    const text = await readTextFileSafe(path);
    if (text !== undefined) {
      await Deno.remove(path);
      deletedFiles.push({ path, text });
    }
  }

  return deletedFiles;
};
