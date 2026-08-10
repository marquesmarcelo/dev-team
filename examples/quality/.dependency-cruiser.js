/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ─── Regras de Arquitetura Hexagonal ─────────────────────────────────────
    {
      name: 'domain-nao-importa-adapter',
      comment: 'domain/ nunca importa de adapter/ — viola o isolamento do domínio',
      severity: 'error',
      from: { path: '^src/domain/' },
      to:   { path: '^src/adapter/' },
    },
    {
      name: 'domain-nao-importa-app',
      comment: 'domain/ nunca importa de app/ ou config/',
      severity: 'error',
      from: { path: '^src/domain/' },
      to:   { path: '^src/(app|config)/' },
    },
    {
      name: 'adapter-http-nao-importa-adapter-postgres',
      comment: 'adapters de tipos diferentes não se importam diretamente',
      severity: 'error',
      from: { path: '^src/adapter/http/' },
      to:   { path: '^src/adapter/postgres/' },
    },
    {
      name: 'adapter-postgres-nao-importa-adapter-http',
      severity: 'error',
      from: { path: '^src/adapter/postgres/' },
      to:   { path: '^src/adapter/http/' },
    },

    // ─── Regras de Frontend (shared/ → features/) ────────────────────────────
    {
      name: 'shared-nao-importa-features',
      comment: 'shared/ nunca importa de features/ — viola o sentido das dependências',
      severity: 'error',
      from: { path: '^src/(components/shared|shared)/' },
      to:   { path: '^src/features/' },
    },
    {
      name: 'features-nao-importa-outra-feature',
      comment: 'features não se importam diretamente — usar shared/ como intermediário',
      severity: 'warn',
      from: { path: '^src/features/([^/]+)/' },
      to:   { path: '^src/features/(?!\\1/)' },
    },

    // ─── Proibições gerais ────────────────────────────────────────────────────
    {
      name: 'sem-import-relativo-acima-de-src',
      severity: 'error',
      from: { path: '^src/' },
      to:   { path: '^\\.\\./\\.\\.' },
    },
    {
      name: 'sem-dependencias-ciclicas',
      severity: 'error',
      from: {},
      to:   { circular: true },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      dot: {
        // Agrupamento por pasta para diagrama mais legível
        collapsePattern: '^(node_modules|src/adapter|src/domain|src/features)/[^/]+',
      },
    },
  },
}
