# @dep/yaml-layer 🗂️

> A lightweight Deno-based tool that transforms YAML content into typed JSON
> artifacts and generates a central TypeScript entry point for easy data access.

## [![JSR version](https://jsr.io/badges/@dep/yaml-layer)](https://jsr.io/@dep/yaml-layer)

## Features ✨

- ⚡ **Lightning Fast**: Incremental builds using a disk-based caching system.
- 🔄 **Live Reload**: Built-in watcher that automatically regenerates artifacts
  on file changes.
- 📂 **Auto-Grouping**: Automatically organizes imports based on your directory
  structure.
- 🆔 **Slug Generation**: Automatically adds URL-friendly slugs and file
  metadata to your content.
- 📦 **Type-Safe**: Generates a `main.ts` file using the latest
  `with { type: "json" }` import attributes.

---

## Installation 📦

- **Deno**:

```bash
deno add jsr:@dep/yaml-layer
deno install -A -n yaml-layer jsr:@dep/yaml-layer/cli
```

---

## Usage 🎯

### CLI 💻

The CLI is the easiest way to manage your content pipeline.

```bash
# Build once
yaml-layer build --contentDir ./my-content --outDir .output

# Watch for changes (short flags)
yaml-layer b -w -d Post
```

### API 🧩

You can integrate the builder directly into your Deno scripts (e.g., in a
`dev.ts` or `build.ts` file).

```typescript
import { builder, watcher } from "@dep/yaml-layer";

const options = {
  contentDir: "./content",
  outDir: ".yaml-layer",
  docType: "Blog", // Resulting export will be 'Blog' or 'FolderBlog'
};

// Start watching for changes
await watcher(options);

// Or run a single build
// await builder(options);
```

### Consuming Generated Data

After running the tool, you can import your data directly from the out
directory:

```typescript
import { ContentProjects, ContentRoot } from "./.yaml-layer/main.ts";

console.log(ContentRoot); // Array of JSON objects from the root content dir
console.log(ContentProjects); // Array of JSON objects from the 'projects/' sub-dir
```

---

## License 📄

MIT License – see [LICENSE](https://www.google.com/search?q=LICENSE) for
details.

**Author:** Estarlin R ([estarlincito.com](https://estarlincito.com))
