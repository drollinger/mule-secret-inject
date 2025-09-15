import { getFilesToWrite, GITIGNORE_PATH, writeEnsuringDir } from "./utils.ts";
import type { cmdInject } from "./command.ts";
import { gitignoreText } from "./fileText.ts";

export const inject = async (
  options: Parameters<Parameters<typeof cmdInject.action>[0]>[0],
) => {
  await writeEnsuringDir([
    ...(await getFilesToWrite(options)),
    { path: GITIGNORE_PATH, text: gitignoreText },
  ]);

  console.log("Files Written!");
  console.log(
    "Ensure you have imported 'Mule Secure Configuration Property Extension' from exchange in the palette",
  );
  console.log("You may need to refreash Anypoint to see any new files");
};
