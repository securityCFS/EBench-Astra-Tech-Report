import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scriptsDir = path.join(root, 'src/scripts');
const orderFile = path.join(scriptsDir, 'order.json');
const publicId = 'virtual:report-runtime';
const resolvedId = '\0' + publicId;

/**
 * Compatibility boundary for the existing interdependent evidence widgets.
 * Astro/Vite owns bundling and watching; no generated JS or copied public tree.
 * New standalone interactions should use ordinary ES modules instead.
 */
export function reportRuntime() {
  return {
    name: 'report-runtime',
    resolveId(id) {
      if (id === publicId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      this.addWatchFile(orderFile);
      const files = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
      const source = files
        .map((name) => {
          const file = path.join(scriptsDir, name);
          this.addWatchFile(file);
          return `/* ${name} */\n${fs.readFileSync(file, 'utf8')}`;
        })
        .join('\n;\n');
      const icons = path.join(root, 'src/lib/icons.js').replaceAll('\\', '/');
      return `import katex from 'katex';\nimport { icon as reportIcon } from ${JSON.stringify(icons)};\n${source}`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(scriptsDir + path.sep)) return;
      const module = server.moduleGraph.getModuleById(resolvedId);
      if (module) server.moduleGraph.invalidateModule(module);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
