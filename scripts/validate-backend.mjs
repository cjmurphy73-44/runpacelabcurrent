// Offline compile/schema gate. Never deploys or contacts a Base44 app.
import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

export function parseResource(text, filename) {
  const parsed = ts.parseConfigFileTextToJson(filename, text);
  if (parsed.error) throw new Error(`${filename}: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n')}`);
  const resource = parsed.config;
  if (!resource || Array.isArray(resource) || typeof resource !== 'object') throw new Error(`${filename}: expected a JSON object`);
  return resource;
}

export function validateEntity(entity, filename) {
  const name = entity.name || entity.$id;
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name || '') || entity.type !== 'object') {
    throw new Error(`${filename}: entity requires an alphanumeric name and type object`);
  }
  if (!entity.properties || Array.isArray(entity.properties) || typeof entity.properties !== 'object') throw new Error(`${filename}: entity properties must be an object`);
  for (const key of entity.required || []) {
    if (!(key in entity.properties)) throw new Error(`${filename}: required field ${key} is not defined`);
  }
  // Validate the shape of declared permissions. Missing/default permissions and
  // access-driving User fields require the separate authorisation audit in PR 3.
  for (const [action, rule] of Object.entries(entity.rls || {})) {
    if (!['create', 'read', 'update', 'delete'].includes(action) || !rule || Array.isArray(rule) || typeof rule !== 'object') {
      throw new Error(`${filename}: invalid ${action} RLS rule`);
    }
  }
}

export async function validateBackend(root = process.cwd()) {
  const backend = resolve(root, 'base44');
  const entries = [];
  for (const folder of await readdir(resolve(backend, 'functions'), { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const files = await readdir(resolve(backend, 'functions', folder.name));
    for (const entry of files.filter(name => /^entry\.[jt]s$/.test(name))) entries.push(resolve(backend, 'functions', folder.name, entry));
  }
  if (!entries.length) throw new Error('No backend entry points found');
  // Compile the complete relative import graph, without executing handlers.
  // Platform SDK/runtime imports stay external. Staging must verify runtime APIs.
  await build({
    entryPoints: entries, outdir: resolve(root, '.backend-validation'),
    bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2022',
    external: ['npm:*', 'jsr:*', 'node:*', 'base44:*', '@base44/*'], logLevel: 'warning',
  });
  let resources = 0;
  const entities = new Set();
  const agents = [];
  for (const kind of ['entities', 'agents', 'connectors', 'workflows']) {
    for (const filename of await readdir(resolve(backend, kind))) {
      if (!filename.endsWith('.jsonc')) throw new Error(`base44/${kind}/${filename}: unsupported resource format, expected .jsonc`);
      const fullPath = resolve(backend, kind, filename);
      const label = relative(root, fullPath);
      const resource = parseResource(await readFile(fullPath, 'utf8'), label);
      if (kind === 'entities') {
        validateEntity(resource, label);
        const name = resource.name || resource.$id;
        if (entities.has(name)) throw new Error(`${label}: duplicate entity ${name}`);
        entities.add(name);
        if (!resource.rls && name !== 'User') console.warn(`${label}: no explicit RLS; security review required in PR 3`);
      }
      if (kind === 'agents') {
        if (!resource.description || !resource.instructions || !Array.isArray(resource.tool_configs)) throw new Error(`${label}: invalid agent configuration`);
        agents.push({ label, resource });
      }
      if (kind === 'connectors' && !resource.type) throw new Error(`${label}: connector requires type`);
      if (kind === 'workflows' && (!resource.name || !resource.definition?.do || !resource.trigger)) throw new Error(`${label}: invalid workflow`);
      resources++;
    }
  }
  const functions = new Set(entries.map(entry => relative(resolve(backend, 'functions'), entry).split('/')[0]));
  for (const { label, resource } of agents) {
    for (const tool of resource.tool_configs) {
      if (tool.entity_name && !entities.has(tool.entity_name)) throw new Error(`${label}: unknown entity ${tool.entity_name}`);
      if (tool.function_name && !functions.has(tool.function_name)) throw new Error(`${label}: unknown function ${tool.function_name}`);
    }
  }
  console.log(`Validated ${entries.length} backend entry graphs and ${resources} resource configurations.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  validateBackend().catch(error => { console.error(error.message); process.exitCode = 1; });
}
