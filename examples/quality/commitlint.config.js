/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos
    'type-enum': [
      2, 'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci', 'perf', 'revert']
    ],
    // Escopo obrigatório — desabilitar se o projeto for pequeno
    'scope-empty': [0, 'never'],
    // Assunto em minúsculas
    'subject-case': [2, 'always', 'lower-case'],
    // Tamanho máximo do header
    'header-max-length': [2, 'always', 100],
  },
}

/*
  Exemplos válidos:
    feat: adicionar filtro de data na listagem de processos
    fix: corrigir validação de CPF no formulário de usuário
    feat!: remover endpoint /v1/auth/login (BREAKING CHANGE)
    docs: atualizar GUIA_DE_USO_AGENTS.md com novos agentes
    chore: atualizar dependências do frontend
    ci: adicionar etapa de knip no pipeline
    test: adicionar testes E2E para fluxo de criação de processo
    refactor: extrair LoadingButton para shared/ui

  Formato: <type>[optional scope]: <description>
  Breaking change: <type>!: <description>
                   ou corpo com "BREAKING CHANGE: <descrição>"
*/
