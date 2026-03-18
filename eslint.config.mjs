import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });
const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];

export default [
  ...eslintConfig,
  // Las páginas de documentación del proyecto contienen texto con comillas sin escapar.
  // En Vercel el lint forma parte del build y la regla `react/no-unescaped-entities`
  // bloquea el despliegue; aquí la desactivamos para evitar falsos positivos.
  {
    files: ["src/app/**/docs/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
];
