# Tasks: <nome-da-feature>

> Referência: spec.md + design.md desta mesma pasta.
> Tarefas organizadas por feature, em grupos de paralelismo. Itens do mesmo
> grupo rodam em paralelo; um grupo só começa quando o anterior termina.
> Nenhum agente aciona outro: a thread principal dispara cada grupo.

## [FEATURE-001] Nome da Feature

### Grupo 1 — Paralelismo inicial
- [ ] dev-fullstack: backend + testes unitários
- [ ] ux-designer: wireframe aprovado

### Grupo 2 — Depende do Grupo 1
- [ ] dev-fullstack: frontend + integração
- [ ] dba: migration consolidada

### Grupo 3 — Review
- [ ] code-reviewer: revisão de código
- [ ] security-reviewer: revisão de segurança
- [ ] qa-tester: suíte completa de testes

<!--
Itens condicionais (incluir no grupo adequado só se design.md indicar):
- dev-ia: integração LLMClient (oportunidade aprovada em oportunidades-ia.md)
- dev-auth / dev-auditoria: fluxos dedicados
- load-tester: teste de carga k6 (gatilho em design.md)
- dev-docker-compose / dev-kubernetes: novo serviço, dependência ou credencial
- tech-writer: atualizar openapi.yaml e CHANGELOG.md
- E2E: escrito pelo dev-fullstack apenas na Fase Release ou se spec.md marcar "E2E antecipado: sim"
-->
