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
      // A leading underscore is the explicit opt-out for a parameter that a
      // port contract requires but this implementation genuinely does not use.
      // Everything else stays an error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "all" }
      ]
    }
  }
];
