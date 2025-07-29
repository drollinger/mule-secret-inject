// Vibe-coded: Not tested with linux or windows

const run = async (cmd: string, args: string[]) => {
  const { code, stdout, stderr } = await new Deno.Command(cmd, {
    args,
  }).output();
  return {
    code,
    out: new TextDecoder().decode(stdout),
    err: new TextDecoder().decode(stderr),
  };
};

const getTokenMac = async (service: string) => {
  const r = await run("security", [
    "find-generic-password",
    "-s",
    service,
    "-w",
  ]);
  if (r.code === 0 && r.out.trim()) return r.out.trim();
};

const getTokenLinux = async (service: string) => {
  const r = await run("secret-tool", ["lookup", "service", service]);
  if (r.code === 0 && r.out.trim()) return r.out.trim();
};

const getTokenWindows = async (service: string) => {
  const list = await run("cmd", ["/c", "cmdkey", "/list"]);
  if (list.code !== 0) return undefined;

  const targets = Array.from(list.out.matchAll(/^\s*Target:\s*(.+)$/gim)).map(
    (m) => m[1].trim(),
  );
  const target =
    targets.find((t) => t.toLowerCase().includes(service.toLowerCase())) ??
      null;
  if (!target) return undefined;

  const ps = [
    "powershell",
    "-NoProfile",
    "-Command",
    `try { Import-Module CredentialManager -ErrorAction Stop; ` +
    `$c = Get-StoredCredential -Target '${target}' -AsCredentialObject; ` +
    `if ($c) { $c.Password } } catch { }`,
  ];
  const out = await new Deno.Command(ps[0], { args: ps.slice(1) }).output();
  const txt = new TextDecoder().decode(out.stdout).trim();
  return txt;
};

export const getFirstToken = async (service: string) => {
  let t: string | undefined;
  switch (Deno.build.os) {
    case "darwin": {
      t = await getTokenMac(service);
      break;
    }
    case "linux": {
      t = await getTokenLinux(service);
      break;
    }
    case "windows": {
      t = await getTokenWindows(service);
      break;
    }
  }
  if (t) {
    const idx = t.indexOf(":");
    return idx !== -1 ? t.slice(idx + 1) : t;
  }
  console.error(
    "No Infisical token found in keyring. Run `infisical login` first or switch vault to file.",
  );
  console.error(
    "This program has not been extensivly tested. If you are logged in to infisical, there's likely an issue with accessing the keyring.",
  );
  throw new Error(`No token found for service '${service}'.`);
};
