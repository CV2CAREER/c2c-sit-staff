/* eslint-disable import/no-anonymous-default-export */
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "scripts/**",
      "next-env.d.ts",
    ],
  },

  {
    rules: {
      // TypeScript safety
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",

      // React / Next safety
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off",

      // General JS
      "no-console": "error",
      "no-debugger": "error",
    },
  },
];
