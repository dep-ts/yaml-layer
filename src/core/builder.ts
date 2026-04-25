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
import { hasUnknown } from '@/utils/unknown.ts';

/**
 * Compiles YAML files into JSON artifacts with schema validation and import maps.
 *
 * @param config Configuration for directories, validation, and transformations.
 * @returns Resolves when the build and cache update are complete.
 * @throws Propagates errors from file access, YAML parsing, or schema validation.
 *
 * @example
 * ```ts
 * import { builder } from '@dep/yaml-layer';
 * import { s } from '@dep/schema';
 *
 * await builder({
 *  docType: 'Service',
 *  contentDir: './content/services',
 *  outDir: './dist/services',
 *  exclude: ['temp'],
 *  schemas: {
 *    ServiceWebs: s.object({ title: s.string() }),
 *  },
 *  transforms: {
 *    ServiceWebs: (data) => ({ ...data, updated: true }),
 *  },
 * });
 * ```
 */
export async function builder(config: YamlLayerConfig = {}): Promise<void> {
  const contentDir = config.contentDir ?? './content';
  const outDir = config.outDir ?? '.yaml-layer';
  const docType = config.docType ?? 'Content';
  const exclude = config.exclude ?? [];
  const schemas = config.schemas ?? {};
  const transforms = config.transforms ?? {};

  if (!fs.existsSync(contentDir)) {
    logDirNotFound(contentDir);
    return;
  }

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

  for await (const entry of fs.expandGlob(`${contentDir}/**/*.+(yaml|yml)`)) {
    if (
      exclude.some((term) =>
        path.relative(absoluteContentPath, entry.path).includes(term)
      )
    ) {
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
      const { _slug, _filePath, _raw, ...rest } = await parseYAML(entry);
      let yamlData = rest;
      hasChanges = true;

      if (schemas[groupName]) {
        yamlData = await schemas[groupName].parseAsync(yamlData);
      }

      if (transforms[groupName]) {
        yamlData = await transforms[groupName]({
          ...yamlData,
          _slug,
          _filePath,
          _raw,
        });
      } else {
        yamlData = { ...yamlData, _slug, _filePath, _raw };
      }

      if (!fs.existsSync(path.join(outDir, internalDir))) {
        await Deno.mkdir(path.join(outDir, internalDir), { recursive: true });
      }

      await Deno.writeTextFile(outputPath, JSON.stringify(yamlData, null, 2));
      await cache.set(entry.path, mtimeNum);
    }

    importsMap[groupName] ??= {};
    importsMap[groupName][importIdentifier] = `./${jsonFile}`;
  }

  if (hasUnknown('schema', schemas, importsMap)) return;
  if (hasUnknown('transform', transforms, importsMap)) return;

  if (hasChanges) {
    await generateJsonImports(importsMap, outDir);
    await cache.set('config', await configHash);
  }
}
