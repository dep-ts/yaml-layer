import { parseYAML } from "@/utils/parse.ts";
import { getMtime } from "@/utils/mtime.ts";
import { useCache } from "@/utils/cache.ts";
import { slug } from "@dep/slug";
import * as fs from "@std/fs";
import * as path from "@dep/path";
import { formatPathIdentifier } from "@/utils/format.ts";
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
  const outDir = opt.outDir ?? ".yaml-layer";
  const docType = opt.docType ?? "Content";
  const configHash = `${contentDir}$${outDir}$${docType}`;
  const cache = await useCache(outDir);
  const cachedConfig = await cache.get("config");
  const importsMap: ImportsMap = {};
  const absoluteContentPath = path.resolve(contentDir);
  let hasChanges = false;

  if (!fs.existsSync(contentDir)) {
    logDirNotFound(contentDir);
    return;
  }

  for await (const entry of fs.expandGlob(`${contentDir}/**/*.+(yaml|yml)`)) {
    const mtimeNum = Number(await getMtime(entry.path));
    const cachedMtime = await cache.get(entry.path);

    const relativeToContent = path.relative(absoluteContentPath, entry.path);
    const jsonFile = relativeToContent.replace(/\.ya?ml$/, ".json");
    const outputPath = path.join(outDir, jsonFile);
    const internalDir = path.dirname(relativeToContent);

    const groupName = `${docType}${formatPathIdentifier(internalDir)}`;
    const importIdentifier = slug(jsonFile, { separator: "" });

    if (cachedMtime !== mtimeNum || cachedConfig !== configHash) {
      const yamlData = await parseYAML(entry);
      hasChanges = true;

      if (!fs.existsSync(path.join(outDir, internalDir))) {
        await Deno.mkdir(path.join(outDir, internalDir), { recursive: true });
      }

      await Deno.writeTextFile(outputPath, JSON.stringify(yamlData, null, 2));
      await cache.set(entry.path, mtimeNum);
    }

    importsMap[groupName] ??= {};
    importsMap[groupName][importIdentifier] = `./${jsonFile}`;
  }

  if (hasChanges) {
    await generateJsonImports(importsMap, outDir);
    await cache.set("config", configHash);
  }
}
