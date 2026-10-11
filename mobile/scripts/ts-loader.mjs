export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('file://')) {
      for (const ext of ['.ts', '.tsx', '/index.ts']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    if (specifier.startsWith('@/')) {
      const rel = specifier.replace('@/', './src/');
      for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
        try {
          return await nextResolve(new URL(rel + ext, context.parentURL || 'file://' + process.cwd() + '/').href, context);
        } catch {}
      }
    }
    throw err;
  }
}
