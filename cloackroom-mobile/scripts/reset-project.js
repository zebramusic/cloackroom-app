#!/usr/bin/env node

/**
 * This script is used to reset the project to a blank state.
 * It deletes or moves the /app, /components, /hooks, /scripts, and /constants directories to /app-example based on user input and creates a new /app directory with an index.tsx and _layout.tsx file.
 * You can remove the `reset-project` script from package.json and safely delete this file after running it.
 */

(async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const readline = await import("node:readline");

  const { existsSync, promises: fsPromises } = fs;
  const { join } = path;
  const { createInterface } = readline;

  const root = process.cwd();
  const oldDirs = ["app", "components", "hooks", "constants", "scripts"];
  const exampleDir = "app-example";
  const newAppDir = "app";
  const exampleDirPath = join(root, exampleDir);

  const indexContent = `import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
`;

  const layoutContent = `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`;

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const moveDirectories = async (userInput) => {
    try {
      if (userInput === "y") {
        await fsPromises.mkdir(exampleDirPath, { recursive: true });
        console.log(`📁 /${exampleDir} directory created.`);
      }

      for (const dir of oldDirs) {
        const oldDirPath = join(root, dir);
        if (existsSync(oldDirPath)) {
          if (userInput === "y") {
            const newDirPath = join(root, exampleDir, dir);
            await fsPromises.rename(oldDirPath, newDirPath);
            console.log(`➡️ /${dir} moved to /${exampleDir}/${dir}.`);
          } else {
            await fsPromises.rm(oldDirPath, { recursive: true, force: true });
            console.log(`❌ /${dir} deleted.`);
          }
        } else {
          console.log(`➡️ /${dir} does not exist, skipping.`);
        }
      }

      const newAppDirPath = join(root, newAppDir);
      await fsPromises.mkdir(newAppDirPath, { recursive: true });
      console.log("\n📁 New /app directory created.");

      const indexPath = join(newAppDirPath, "index.tsx");
      await fsPromises.writeFile(indexPath, indexContent);
      console.log("📄 app/index.tsx created.");

      const layoutPath = join(newAppDirPath, "_layout.tsx");
      await fsPromises.writeFile(layoutPath, layoutContent);
      console.log("📄 app/_layout.tsx created.");

      console.log("\n✅ Project reset complete. Next steps:");
      console.log(
        `1. Run \`npx expo start\` to start a development server.\n2. Edit app/index.tsx to edit the main screen.${
          userInput === "y"
            ? `\n3. Delete the /${exampleDir} directory when you're done referencing it.`
            : ""
        }`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error during script execution: ${message}`);
    }
  };

  rl.question(
    "Do you want to move existing files to /app-example instead of deleting them? (Y/n): ",
    (answer) => {
      const userInput = answer.trim().toLowerCase() || "y";
      if (userInput === "y" || userInput === "n") {
        moveDirectories(userInput).finally(() => rl.close());
      } else {
        console.log("❌ Invalid input. Please enter 'Y' or 'N'.");
        rl.close();
      }
    }
  );
})().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Unexpected error: ${message}`);
  process.exitCode = 1;
});
