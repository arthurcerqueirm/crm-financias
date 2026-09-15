import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // next-env.d.ts é gerado automaticamente pelo Next e nem fica versionado.
    ignores: [".next/**", "node_modules/**", "scripts/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
