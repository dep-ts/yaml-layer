import { builder } from '@/core/builder.ts';
import { YamlLayerConfig } from './config.ts';

import * as path from '@dep/path';
import * as fs from '@std/fs';
import { bold, cyan, dim, green } from '@std/fmt/colors';
import { logDirNotFound, logUpdate } from '@/utils/log.ts';

/**
 * Watches for YAML changes and rebuilds artifacts automatically.
 *
 * @param config Configuration for directories, validation, and transformations.
 * @returns Resolves if the watch process is terminated.
 * @throws Propagates filesystem watcher or builder execution errors.
 *
 * @example
 * ```ts
 * import { watcher } from '@dep/yaml-layer';
 * import { s } from '@dep/schema';
 *
 * await watcher({
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
export async function watcher(config: YamlLayerConfig = {}) {
  const contentDir = config.contentDir ?? './content';
  const outDir = config.outDir ?? '.yaml-layer';

  if (!fs.existsSync(contentDir)) {
    logDirNotFound(contentDir);
    return;
  }

  console.log(`\n  ${cyan(bold('YAML-LAYER'))} ${dim(`v1.0.0`)}`);
  console.log(
    `\n  ${green('➜')}  ${bold('Watching')}: ${dim(path.resolve(contentDir))}`,
  );
  console.log(
    `  ${green('➜')}  ${bold('Output')}:   ${dim(path.resolve(outDir))}\n`,
  );

  await builder(config);

  const watcher = Deno.watchFs(contentDir);
  let timer: number | undefined;

  for await (const event of watcher) {
    if (['create', 'modify', 'rename', 'remove'].includes(event.kind)) {
      const hasYaml = event.paths.some(
        (p) => p.endsWith('.yaml') || p.endsWith('.yml'),
      );

      if (hasYaml) {
        if (timer) clearTimeout(timer);

        timer = setTimeout(async () => {
          const startTime = performance.now();
          await builder(config);

          const duration = performance.now() - startTime;
          const filePath = path.relative(Deno.cwd(), event.paths[0].trim());
          logUpdate(filePath, duration);

          timer = undefined;
        }, 100);
      }
    }
  }
}
