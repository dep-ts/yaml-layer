# @dep/yaml-layer 🗂️

> A lightweight Deno-based tool that transforms YAML content into typed JSON
> artifacts and generates a central TypeScript entry point for easy data access.

## [![JSR version](https://jsr.io/badges/@dep/yaml-layer)](https://jsr.io/@dep/yaml-layer)

## Features ✨

- 📂 **Auto-Discovery**: Scans directories for `.yaml` and `.yml` files
  recursively.
- ⚡ **Blazing Fast**: Uses a disk-based cache system to only rebuild modified
  files.
- 🛠️ **Data Transformation**: Hook into the build process to modify or extend
  your data.
- 🛡️ **Schema Validation**: Integration with `@dep/schema` to ensure content
  integrity.
- 🔄 **Watch Mode**: Real-time rebuilding as you edit your content files.
- 📦 **Type-Safe Imports**: Generates a `main.ts` file with grouped JSON
  imports.

---

## Installation 📦

- **Deno**:

  ```bash
  deno add jsr:@dep/yaml-layer
  deno install -A -n yaml-layer jsr:@dep/yaml-layer/cli
  ```

- **Node.js (18+) or Bun**:

  ```bash
  npx jsr add @dep/yaml-layer
  ```

  Then import as an ES module:

  ```typescript
  import { builder, defineConfig } from '@dep/yaml-layer';
  ```

---

## Usage 🎯

### CLI 💻

Run the build process or start the watcher directly from your terminal:

```bash
# Basic build
yaml-layer build

# Build with custom options
yaml-layer build ./content --outDir ./dist --docType Blog

# Watch for changes
yaml-layer build --watch
```

### API 🧩

#### Configuration File

Create a `yaml-layer.config.ts` in your root directory for advanced setups:

```typescript
import { defineConfig } from '@dep/yaml-layer';
import { s } from '@dep/schema';

export default defineConfig({
  contentDir: './content',
  outDir: './.generated',
  schema: s.object({
    title: s.string(),
    date: s.date(),
    draft: s.boolean().optional(),
  }),
  transform: (entry) => {
    return {
      ...entry,
      readingTime: Math.ceil(entry._raw.length / 500),
    };
  },
});
```

#### Programmatic Usage

You can also trigger the builder or watcher directly in your scripts:

```typescript
import { builder, watcher } from '@dep/yaml-layer';

// Run a single build
await builder({
  contentDir: './docs',
  outDir: './data',
});

// Or start a watcher
await watcher({
  contentDir: './docs',
});
```

---

## License 📄

MIT License – see [LICENSE](LICENSE) for details.

**Author:** Estarlin R ([estarlincito.com](https://estarlincito.com))
