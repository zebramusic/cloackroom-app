// https://docs.expo.dev/guides/using-eslint/
module.exports = async () => {
  const { defineConfig } = await import("eslint/config");
  const { default: expoConfig } = await import("eslint-config-expo/flat");

  return defineConfig([
    expoConfig,
    {
      ignores: ["dist/*"],
      settings: {
        "import/resolver": {
          typescript: {},
          node: {},
        },
      },
    },
  ]);
};
