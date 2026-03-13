import { builder, Options } from "@/core/builder.ts";
import * as path from "@dep/path";
import * as fs from "@std/fs";
import { bold, cyan, dim, green } from "@std/fmt/colors";
import { logDirNotFound, logUpdate } from "@/utils/log.ts";

/**
 * Watches a content directory for YAML file changes and rebuilds generated artifacts.
 *
 * The function performs an initial build using `builder`, then listens for filesystem
 * events inside the content directory. When a `.yaml` or `.yml` file change is detected,
 * it debounces the event and runs the build process again, logging the updated file.
 *
 * @param opt Optional configuration passed directly to the builder, including the content directory.
 * @returns Resolves only if the watcher loop exits (normally it runs indefinitely).
 * @throws Propagates filesystem or build errors produced by `Deno.watchFs` or `builder`.
 *
 * @example
 * ```ts
 * await watcher({
 *   contentDir: "./content",
 *   outDir: ".yaml-layer",
 *   docType: "Post",
 * });
 * ```
 */
export async function watcher(opt: Options = {}) {
  const contentDir = opt.contentDir ?? "./content";
  const outDir = opt.outDir ?? ".yaml-layer";

  if (!fs.existsSync(contentDir)) {
    logDirNotFound(contentDir);
    return;
  }

  console.log(`\n  ${cyan(bold("YAML-LAYER"))} ${dim(`v1.0.0`)}`);
  console.log(
    `\n  ${green("➜")}  ${bold("Watching")}: ${dim(path.resolve(contentDir))}`,
  );
  console.log(
    `  ${green("➜")}  ${bold("Output")}:   ${dim(path.resolve(outDir))}\n`,
  );

  await builder(opt);

  const watcher = Deno.watchFs(contentDir);
  let timer: number | undefined;

  for await (const event of watcher) {
    if (["create", "modify", "rename", "remove"].includes(event.kind)) {
      const hasYaml = event.paths.some(
        (p) => p.endsWith(".yaml") || p.endsWith(".yml"),
      );

      if (hasYaml) {
        if (timer) clearTimeout(timer);

        timer = setTimeout(async () => {
          const startTime = performance.now();
          await builder(opt);

          const duration = performance.now() - startTime;
          const filePath = path.relative(Deno.cwd(), event.paths[0].trim());
          logUpdate(filePath, duration);

          timer = undefined;
        }, 100);
      }
    }
  }
}
