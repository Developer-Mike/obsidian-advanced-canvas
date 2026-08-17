import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores([
    "node_modules",
    "dist",
    "esbuild.config.mjs",
    "eslint.config.js",
    "version-bump.mjs",
    "versions.json",
    "main.js",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js", "manifest.json"],
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"],
      },
    },
  },
  ...obsidianmd.configs.recommended,
  {
    rules: {
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          acronyms: ["SVG", "F3"],
          brands: [
            "Obsidian",
            "Advanced Canvas",
            "Focus Mode",
            "Properties view",
          ],
        },
      ],
    },
  },
]);
