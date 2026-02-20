import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".cache/**",
      "dist/**",
      "build/**",
      "create-agentic-app/**",
      "drizzle/**",
      "scripts/**",
    ],
  },
  ...nextConfig,
  {
    files: [
      "src/app/**/page.ts",
      "src/app/**/page.tsx",
      "src/app/**/layout.ts",
      "src/app/**/layout.tsx",
      "src/app/**/template.ts",
      "src/app/**/template.tsx",
      "src/app/**/error.ts",
      "src/app/**/error.tsx",
      "src/app/**/loading.ts",
      "src/app/**/loading.tsx",
      "src/app/**/default.ts",
      "src/app/**/default.tsx",
      "src/app/**/not-found.ts",
      "src/app/**/not-found.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='dynamic'][arguments.1.type='ObjectExpression'] Property[key.name='ssr'][value.value=false]",
          message:
            "Do not use next/dynamic with ssr: false in Server Components. Move it into a client wrapper component (e.g. *-client.tsx).",
        },
      ],
    },
  },
  {
    rules: {
      // React rules
      "react/jsx-no-target-blank": "error",
      "react/no-unescaped-entities": "off",

      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import rules
      "import/no-anonymous-default-export": "warn",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "type",
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
          "newlines-between": "never",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // Best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
];

export default config;
