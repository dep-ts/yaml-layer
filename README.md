# @dep/yaml-layer 🗂️

> A lightweight, type-safe YAML-to-JSON compiler and watcher for Deno.

## [![JSR version](https://jsr.io/badges/@dep/yaml-layer)](https://jsr.io/@dep/yaml-layer)

## Features ✨

- ⚡ **Incremental Builds**: Uses file system modification times to cache unchanged files.
- 🛡️ **Type Safety**: Enforce structure via custom schemas (e.g., Zod) per directory.
- 🔄 **Transforms**: Modify or extend your data programmatically before it's saved.
- 🏗️ **Auto-Imports**: Generates a `main.ts` file with standard JSON imports for easy use.
- 📡 **Hot Reloading**: Built-in watcher that debounces file system events for rapid development.

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
  import { builder, watcher, defineConfig } from '@dep/yaml-layer';
  ```

---

## Usage 🎯

### CLI 💻

Build your project manually or start the watcher for real-time development:

```bash
# Basic build (defaults to ./content)
yaml-layer build

# Watch mode with custom output
yaml-layer build --watch --outDir ./dist/data

# Custom config path
yaml-layer build -c ./custom.config.ts
```

### API 🧩

Use `defineConfig` for full type safety when configuring your data layers:

```typescript
// yaml-layer.config.ts
import { defineConfig } from '@dep/yaml-layer/config';
import { s } from '@dep/schema'; // example schema library

export default defineConfig({
  contentDir: './docs',
  outDir: './.gen',
  docType: 'Wiki', // Groups will be named WikiRoot, WikiGuides, etc.
  schemas: {
    WikiRoot: s.object({
      title: s.string(),
      priority: s.number(),
    }),
  },
  transforms: {
    WikiGuides: (data) => ({
      ...data,
      readingTime: Math.ceil(data._raw.length / 200),
    }),
  },
});
```

To run it via code:

```typescript
import { builder, watcher } from '@dep/yaml-layer';

// One-time build
await builder();

// Or watch for changes
await watcher();
```

### Consuming Data 📦

Once the artifacts are generated, simply import the grouped constants directly into your application

```typescript
// Import the generated constants from your outDir (e.g., ./.gen/main.ts)
import { WikiGuides, WikiRoot } from './.gen/main.ts';

// Single entry access (e.g., a landing page config)
const siteConfig = WikiRoot[0];
console.log(`Welcome to ${siteConfig.title}`);

// Collection iteration (e.g., a blog or documentation list)
WikiGuides.forEach((page) => {
  console.log(`- ${page.title} (ID: ${page._slug})`);
});
```

---

## License 📄

MIT License – see [LICENSE](LICENSE) for details.

**Author:** Estarlin R ([estarlincito.com](https://estarlincito.com))
