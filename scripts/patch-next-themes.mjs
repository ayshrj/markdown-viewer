import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  join(root, "node_modules/next-themes/dist/index.mjs"),
  join(root, "node_modules/next-themes/dist/index.js"),
];

for (const file of files) {
  let source = readFileSync(file, "utf8");
  const original = source;

  // React 19 / Next 16 warns when next-themes renders its inline <script>
  // from a Client Component. This app gates rendering behind a loader, so the
  // script is unnecessary; effects apply the selected theme after mount.
  source = source.replace(
    /return t\.createElement\("script",\{[^}]*dangerouslySetInnerHTML:\{__html:`\(\$\{M\.toString\(\)\}\)\(\$\{p\}\)`\}\}\)/,
    "return null",
  );
  source = source.replace(
    /return t\.createElement\("script",\{[^}]*dangerouslySetInnerHTML:\{__html:`\(\$\{I\.toString\(\)\}\)\(\$\{p\}\)`\}\}\)/,
    "return null",
  );

  if (source === original) {
    if (source.includes("return null")) {
      continue;
    }

    throw new Error(`Could not patch next-themes script renderer in ${file}`);
  }

  writeFileSync(file, source);
  console.log(`Patched ${file}`);
}
