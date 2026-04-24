import { parseYAML } from '@/utils/parse.ts';
import { getMtime } from '@/utils/mtime.ts';
import { useCache } from '@/utils/cache.ts';
import { slug } from '@dep/slug';
import * as fs from '@std/fs';
import * as path from '@dep/path';
import { formatPathIdentifier } from '@/utils/format.ts';
import { logDirNotFound } from '@/utils/log.ts';

import { generateJsonImports, ImportsMap } from '@/utils/main.ts';
import { YamlLayerConfig } from './config.ts';
import { ContentEntry } from '@dep/yaml-layer';
import { s } from '@dep/schema';

/**
 * Builds JSON artifacts from YAML files and generates an import map for them.
 *
 * The function scans a content directory for `.yaml` and `.yml` files, parses them,
 * writes JSON versions into a generated directory, and creates grouped import
 * definitions for use in code. A cache based on file modification time prevents
 * regenerating unchanged files.
 *
 * @param opt Optional configuration controlling input directory, output directory, exclusion patterns, and document type grouping.
 * @returns Resolves when the build process completes.
 * @throws Will propagate filesystem or parsing errors that occur during reading, writing, or directory creation.
 *
 * @example
 * ```ts
 * import { builder } from "@dep/yaml-layer";
 * import { s } from "@dep/schema";
 *
 * await builder({
 *  contentDir: './docs',
 *  outDir: './dist/data',
 *  schema: s.object({
 *    title: s.string(),
 *   date: s.date(),
 * }),
 *  transform: (data) => ({
 *    ...data,
 *    year: new Date(data.date).getFullYear(),
 *  }),
 * });
 * ```
 */
export async function builder(config: YamlLayerConfig = {}): Promise<void> {
  const contentDir = config.contentDir ?? './content';
  const outDir = config.outDir ?? '.yaml-layer';
  const docType = config.docType ?? 'Content';
  const exclude = config.exclude ?? [];

  const configHash = (async () => {
    if ('configPath' in config && typeof config.configPath === 'string') {
      return String(await getMtime(config.configPath));
    }
    return `${contentDir}$${outDir}$${docType}$${exclude}`;
  })();

  const cache = await useCache(outDir);
  const cachedConfig = await cache.get('config');
  const importsMap: ImportsMap = {};
  const absoluteContentPath = path.resolve(contentDir);
  let hasChanges = false;

  if (!fs.existsSync(contentDir)) {
    logDirNotFound(contentDir);
    return;
  }

  for await (const entry of fs.expandGlob(`${contentDir}/**/*.+(yaml|yml)`)) {
    if (exclude.some((term) => entry.path.includes(term))) {
      continue;
    }

    const mtimeNum = Number(await getMtime(entry.path));
    const cachedMtime = await cache.get(entry.path);

    const relativeToContent = path.relative(absoluteContentPath, entry.path);
    const jsonFile = relativeToContent.replace(/\.ya?ml$/, '.json');
    const outputPath = path.join(outDir, jsonFile);
    const internalDir = path.dirname(relativeToContent);

    const groupName = `${docType}${formatPathIdentifier(internalDir)}`;
    const importIdentifier = slug(jsonFile, { separator: '' });

    if (cachedMtime !== mtimeNum || cachedConfig !== (await configHash)) {
      hasChanges = true;
      let yamlData = await parseYAML(entry);

      if (config.schema) {
        yamlData = config.schema
          .extend({
            _slug: s.string(),
            _filePath: s.string(),
            _raw: s.string(),
          })
          .parse(yamlData) as ContentEntry;
      }

      const finalData = config.transform
        ? await config.transform(yamlData)
        : yamlData;

      if (!fs.existsSync(path.join(outDir, internalDir))) {
        await Deno.mkdir(path.join(outDir, internalDir), { recursive: true });
      }

      await Deno.writeTextFile(outputPath, JSON.stringify(finalData, null, 2));
      await cache.set(entry.path, mtimeNum);
    }

    importsMap[groupName] ??= {};
    importsMap[groupName][importIdentifier] = `./${jsonFile}`;
  }

  if (hasChanges) {
    await generateJsonImports(importsMap, outDir);
    await cache.set('config', await configHash);
  }
}
