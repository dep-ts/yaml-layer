import { parseYAML } from "@/utils/parse.ts";
import { getMtime } from "@/utils/mtime.ts";
import { useCache } from "@/utils/cache.ts";
import * as fs from "@std/fs";
import * as path from "@dep/path";
import { logDirNotFound } from "@/utils/log.ts";

import { generateJsonImports, ImportsMap } from "@/utils/main.ts";

export interface Options {
  contentDir?: string;
  outDir?: string;
  docType?: string;
}

/**
 * Builds JSON artifacts from YAML files and generates an import map for them.
 *
 * The function scans a content directory for `.yaml` and `.yml` files, parses them,
 * writes JSON versions into a generated directory, and creates grouped import
 * definitions for use in code. A cache based on file modification time prevents
 * regenerating unchanged files.
 *
 * @param opt Optional configuration controlling input directory, output directory, and document type grouping.
 * @returns Resolves when the build process completes.
 * @throws Will propagate filesystem or parsing errors that occur during reading, writing, or directory creation.
 *
 * @example
 * ```ts
 * await builder({
 *   contentDir: "./content",
 *   outDir: ".yaml-layer",
 *   docType: "Post",
 * });
 * ```
 */
export async function builder(opt: Options = {}): Promise<void> {
  const contentDir = opt.contentDir ?? "./content";

  if (!fs.existsSync(contentDir)) {
    logDirNotFound(contentDir);
    return;
  }

  const outDir = opt.outDir ?? ".yaml-layer";
  const docType = opt.docType ?? "Content";

  const cache = await useCache(outDir);
  const importsMap: ImportsMap = {};
  let hasChanges = false;

  const absoluteContentPath = path.resolve(contentDir);

  for await (const entry of fs.expandGlob(`${contentDir}/**/*.+(yaml|yml)`)) {
    const yamlData = await parseYAML(entry);
    const mtimeNum = Number(await getMtime(entry.path));

    const relativeFromContent = path.relative(absoluteContentPath, entry.path);
    const relativeDir = path.dirname(relativeFromContent);
    const topLevelDir = relativeDir === "."
      ? ""
      : relativeDir.split(path.SEPARATOR)[0];

    const generatedDir = path.join(outDir, "generated", relativeDir);
    const fileName = `${yamlData._slug}.json`;
    const outputPath = path.join(generatedDir, fileName);

    const groupName = `${topLevelDir}${docType}`;
    const importIdentifier = topLevelDir
      ? `${topLevelDir}_${yamlData._slug}`
      : `${yamlData._slug}`;

    if ((await cache.get(entry.path)) !== mtimeNum) {
      hasChanges = true;

      if (!fs.existsSync(generatedDir)) {
        await Deno.mkdir(generatedDir, { recursive: true });
      }

      await Deno.writeTextFile(outputPath, JSON.stringify(yamlData, null, 2));
      await cache.set(entry.path, mtimeNum);
    }

    importsMap[groupName] ??= {};
    const relativeImportPath = `./${path.join(topLevelDir, fileName)}`;
    importsMap[groupName][importIdentifier] = relativeImportPath;
  }

  if (hasChanges) {
    await generateJsonImports(importsMap, outDir);
  }
}
