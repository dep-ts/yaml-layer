// deno-lint-ignore-file no-explicit-any
import type { ObjectSchema } from '@dep/schema';
import { resolveConfigPath } from '@/utils/path.ts';

/**
 * Represents the standard structure of a processed YAML entry.
 */
export interface ContentEntry {
  /** The URL-friendly identifier derived from the filename. */
  _slug: string;
  /** The absolute system path to the source file. */
  _filePath: string;
  /** The raw, unparsed string content of the YAML file. */
  _raw: string;
  [key: string]: any;
}

/**
 * Configuration options for the YamlLayer build process.
 */
export interface YamlLayerConfig<T = any> {
  /** The directory containing source YAML content. Defaults to `./content`. */
  contentDir?: string;
  /** The directory where JSON and the main.ts index will be generated. Defaults to `.yaml-layer`. */
  outDir?: string;
  /** The base name for the exported TypeScript constants. Defaults to `Content`. */
  docType?: string;
  /** List of path patterns to ignore during the scan. */
  exclude?: Array<string>;
  /** A synchronous or asynchronous function to modify data after parsing but before writing to disk. */
  transform?: (entry: ContentEntry) => T | Promise<T>;
  /** A validation schema (e.g., from `@dep/schema`) to enforce structure on the YAML data. */
  schema?: ObjectSchema;
}
/**
 * Helper function to provide type-safety when defining a configuration file.
 * * @param config The YamlLayer configuration object.
 * @returns The validated configuration object.
 */
export function defineConfig<T>(
  config: YamlLayerConfig<T>,
): YamlLayerConfig<T> {
  return config;
}

/**
 * Dynamically loads the configuration file from the filesystem.
 * * @param configPath Optional explicit path to a config file.
 * If omitted, it looks for `yaml-layer.config.ts` in the current working directory.
 * @returns The loaded configuration merged with the detected config path.
 */
export async function loadConfig(
  configPath?: string,
): Promise<YamlLayerConfig & { configPath?: string }> {
  const filePath = resolveConfigPath(configPath);

  try {
    if (filePath) {
      const mod = await import(filePath);

      if (mod.default && typeof mod.default === 'object') {
        return { ...mod.default, configPath: filePath };
      }
    }

    return { configPath: filePath };
  } catch {
    return { configPath: filePath };
  }
}
