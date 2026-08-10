import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    // Next.js
    'src/app/**/{page,layout,loading,error,not-found,route,template}.{ts,tsx}',
    'src/app/**/default.ts',
    // Entrypoints comuns
    'src/main.ts',
    'src/index.ts',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    // Arquivos gerados
    'src/**/*.generated.ts',
    'src/**/*.d.ts',
    '.next/**',
    'dist/**',
    'coverage/**',
  ],
  ignoreDependencies: [
    // Dependências usadas via config (não via import direto)
    '@types/*',
    'typescript',
    'ts-node',
  ],
  // Plugins — ativa detecção específica por framework
  next: {
    entry: [
      'src/app/**/{page,layout,loading,error,route}.{ts,tsx}',
      'src/middleware.ts',
    ],
  },
}

export default config
