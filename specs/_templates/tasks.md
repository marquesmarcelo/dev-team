# Tasks: <nome-da-feature>

> Referência: spec.md + design.md desta mesma pasta.
> Cada tarefa deve ser pequena o suficiente para revisar em um único diff e
> testável isoladamente — se não for, quebre mais.

## Backend

- [ ] **T1** — Criar entidade `<Nome>` em `/domain` com invariantes de `<regra>`
  - Subagent sugerido: `arquiteto` (revisão) → `dev-backend` (implementação)
- [ ] **T2** — Criar interface `<NomeRepository>` em `/port`
  - Subagent sugerido: `dev-backend`
- [ ] **T3** — Implementar use case `<NomeUseCase>` com testes (TDD, mock do port)
  - Subagent sugerido: `dev-backend`
  - Critério de aceite coberto: Cenário "<nome do cenário em spec.md>"
- [ ] **T4** — Implementar adapter de persistência (camada `adapter`,
  biblioteca de acesso a dados definida na skill da stack configurada) +
  migration com `up`/`down` testados
  - Subagent sugerido: `dba` (migration + revisão de query) → `dev-backend` (adapter)
  - Confirmar: PK é UUIDv7, nenhum ID sequencial introduzido
- [ ] **T5** — Implementar handler/controller de entrada (camada `adapter`)
  - Subagent sugerido: `dev-backend`

## UX (apenas se a feature tiver interface visual relevante)

- [ ] **T5b** — Desenhar fluxo de tela(s), estados (vazio/carregando/erro)
  e hierarquia visual
  - Subagent sugerido: `ux-designer`
  - Saída: `specs/<feature>/ux.md`, consumido pelo `dev-frontend`

## Frontend

- [ ] **T6** — Criar hook/camada de dados para consumir a API
  - Subagent sugerido: `dev-frontend`
- [ ] **T7** — Criar componente(s) de tela usando a biblioteca de
  componentes configurada, seguindo ux.md (se existir)
  - Subagent sugerido: `dev-frontend`

## Transversal

- [ ] **T8** — Revisão de segurança (se T5 envolve autenticação/dado sensível)
  - Subagent sugerido: `security-reviewer`
- [ ] **T8b** — Revisão de qualidade de código e aderência arquitetural
  - Subagent sugerido: `code-reviewer`
- [ ] **T9** — Construir testes E2E a partir dos exemplos concretos de
  spec.md
  - Subagent sugerido: `construtor-testes-e2e`
- [ ] **T9b** — Validar (de forma independente) os testes E2E e os testes
  de unidade, gerar evidence.md com resultado executado de fato
  - Subagent sugerido: `qa-tester`
- [ ] **T10** — Atualizar docker-compose.yml e manifestos K8s se houver novo
  serviço, dependência, ou credencial nova (sempre via env/Secret, nunca
  texto plano)
  - Subagent sugerido: `devops`
- [ ] **T11** (condicional, se design.md indicar) — Implementar cache
  cache-aside com TTL e invalidação via Domain Event
  - Subagent sugerido: `dev-backend`
- [ ] **T12** (condicional, se design.md indicar) — Implementar checagem de
  `Idempotency-Key` no handler
  - Subagent sugerido: `dev-backend`
- [ ] **T13** (condicional, se design.md indicar chamada externa) —
  Envolver chamada externa com circuit breaker no adapter
  - Subagent sugerido: `dev-backend`
- [ ] **T14** (condicional, se houver oportunidade de IA aprovada em
  oportunidades-ia.md) — Implementar interface `LLMClient` + adapter do
  provedor configurado, com saída estruturada validada e fallback
  - Subagent sugerido: `dev-ia`
- [ ] **T15** (condicional, se design.md indicar) — Construir e rodar
  teste de carga (k6) contra o limite definido em spec.md
  - Subagent sugerido: `load-tester`
- [ ] **T16** — Atualizar `openapi.yaml` (e `CHANGELOG.md`) refletindo o
  contrato real implementado; sinalizar breaking change se houver
  - Subagent sugerido: `tech-writer`

## Ordem de execução recomendada
T1 → T2 → T3 → T4 → T5 → T5b → (T6, T7 em paralelo) → (T8, T8b em paralelo) → T9 → T9b → T10 → T15 (se aplicável) → T16
