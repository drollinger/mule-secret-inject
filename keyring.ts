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

export const getToken = async () => {
  const r = await run("infisical", ["user", "get", "token", "--plain"]);
  if (r.code === 0 && r.out.trim()) return r.out.trim();
  console.error(
    "No Infisical token found in keyring. Run `infisical login` first or switch vault to file.",
  );
  throw new Error("No infisical token found!");
};
