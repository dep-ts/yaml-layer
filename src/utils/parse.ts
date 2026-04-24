import { parse } from '@std/yaml/parse';
import { WalkEntry } from '@std/fs';
import { slug } from '@dep/slug';

export async function parseYAML(file: WalkEntry) {
  const _slug = slug(file.name.split(/\.yaml|\.yml/)[0]);
  const _filePath = file.path;
  const _raw = await Deno.readTextFile(_filePath);

  const entry = {
    ...(parse(_raw) as Record<string, PropertyKey>),
    _slug,
    _filePath,
    _raw,
  };

  return entry;
}
