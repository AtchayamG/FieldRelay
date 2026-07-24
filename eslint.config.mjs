export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: await import("@typescript-eslint/parser").then(m => m.default)
    },
    plugins: {
      "@typescript-eslint": await import("@typescript-eslint/eslint-plugin").then(m => m.default)
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error"
    }
  }
];
