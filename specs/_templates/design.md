# Design: <nome-da-feature>

> Referência: specs/<nome-da-feature>/spec.md

## Diagrama Mermaid

> Tipo conforme a feature:
> - `sequenceDiagram` — comunicação entre camadas (frontend/backend/banco/fila/serviço externo)
> - `stateDiagram-v2` — transições de estado de entidade ou fluxo de autorização
> - `flowchart` — fluxo de decisão ou arquitetura de componentes

```mermaid
<diagrama aqui — gerado pelo arquiteto>
```

## Impacto na arquitetura hexagonal

### Domain
- Entidades novas/alteradas: <ex: `Processo`, `Usuario`>
- Invariantes de negócio: <regras que a entidade deve sempre respeitar>
- **Value Objects identificados:** <lista — ex: `Email` (validação de
  formato), `CPF` (dígito verificador), `StatusProcesso` (transições
  válidas) — ou "nenhum novo nesta feature, reusar existentes: <quais>">
  - Para cada um: novo ou reutilizado de `/domain/valueobject`?

### Use cases
- <NomeDoUseCase> — orquestra: <descrição curta>

### Ports (interfaces) necessárias
- `<NomeRepository>` — métodos: <Create, FindByID, ...>
- `<OutraInterface>` — propósito: <...>

### Adapters impactados
- `/adapter/http`: novo handler em <rota>
- `/adapter/postgres`: nova tabela/migration? <sim/não>
- Outro adapter externo (ex: api-externa, fila, e-mail): <qual e por quê>

### Identificadores
- ID da(s) entidade(s): UUIDv7 (confirmar — nunca sequencial)
- Algum endpoint precisa de identificador adicional amigável (ex: número
  de protocolo visível ao usuário)? Se sim, esse campo é distinto da PK e
  não deve ser usado para busca/autorização sem validação adicional.
- Campos base presentes (`id`, `criado_em`, `atualizado_em`, `excluido_em`)? [ ] Confirmado

### Padrão CRUD (se a feature é listagem/cadastro de entidade)
- Campos de filtro (confirmados com o dono do produto via ux.md): <...>
- Colunas do grid (confirmadas via ux.md): <...>
- Colunas ordenáveis (allowlist — confirmadas via ux.md): <...>
- Ordenação padrão (coluna + direção, aplicada quando o usuário não
  escolheu outra): <ex: criado_em, decrescente>
- Tamanho de página padrão: <ex: 20> — máximo aceito: <ex: 100>
- Formulário abre em página ou modal (ver ux.md): <...>
- Exclusão é lógica (`excluido_em`), nunca `DELETE` real — [ ] Confirmado

### Busca (se a feature tem campo de busca textual)
- [ ] Busca nativa do Postgres (tsvector/GIN) — padrão
- [ ] Elasticsearch — só se gatilho do Roadmap de Maturidade foi atingido;
      justificar:

### Teste de carga necessário?
- [ ] Não — funcionalidade de baixo tráfego ou não-crítica
- [ ] Sim — motivo: <endpoint crítico / alto tráfego esperado / requisito
      não-funcional explícito em spec.md> — atribuir ao `load-tester` com
      o limite definido em spec.md (RPS, latência p95)

### CQRS-leve
- [ ] Comando (`/usecase/command`) — altera estado
- [ ] Consulta (`/usecase/query`) — somente leitura
- Lê de projeção/view otimizada? <sim/não — qual>

### Domain Events
- Evento(s) emitido(s): <nome do evento, ex: ProcessoCriado>
- Handler(s) que reagem (cache, métrica, outro): <descrever>

### Cache
- [ ] Não se aplica
- [ ] Sim — chave: <padrão da chave> / TTL: <tempo> / invalidado por:
      <qual evento/comando invalida>

### Idempotência
- [ ] Não se aplica (consulta, ou comando não repetível por natureza)
- [ ] Sim — exige `Idempotency-Key` no header

### Chamada a serviço externo
- [ ] Não se aplica
- [ ] Sim — serviço: <ex: api-externa> — circuit breaker obrigatório

### pgvector / PostGIS
- [ ] Não se aplica
- [ ] pgvector — caso de uso: <ex: busca semântica de quê>
- [ ] PostGIS — caso de uso: <ex: geolocalização de quê>

### Mensageria (avaliação obrigatória em toda feature)
- [ ] REST síncrono suficiente — motivo: <...>
- [ ] Mensageria adotada — broker: <RabbitMQ/Kafka> — motivo: <...>
  - Outbox Pattern: [ ] incluído como requisito
  - Fan-out para: <quais consumidores>
  - Tarefa para `devops` configurar broker: [ ] incluída em tasks.md

### Stateless / multi-container
- [ ] Sem estado local — sem impacto adicional
- [ ] Estado de sessão → Redis (`Session` em `/port`)
- [ ] Lock exclusivo → Redis lock
- [ ] Escrita em disco → armazenamento externo: <qual>

### Testes planejados (derivados da seção "Proposta de testes" em spec.md)
- Unitários (use case): <cenários a cobrir>
- Integração (handler): <rotas, códigos de status>
- E2E (Playwright): <fluxos, incluindo comportamentos assíncronos de UI>

### Gatilho do Roadmap de Maturidade atingido?
- [ ] Não — segue com os padrões já adotados (CLAUDE.md)
- [ ] Sim — qual: <mensageria / event sourcing / saga / CQRS pesado> —
      justificativa: <preencher, com referência ao gatilho objetivo>

### Oportunidades de IA (se houver specs/<feature>/oportunidades-ia.md)
- Oportunidade(s) aprovada(s) pelo dono do produto: <nome(s)>
- Onde entra na arquitetura: interface `LLMClient` em `/port` — método: <...>
- Síncrono (bloqueia a resposta) ou assíncrono (processado depois)?
- Exige human-in-the-loop antes de qualquer efeito? <sim/não>
- Fallback se a chamada de IA falhar: <degradar para resposta padrão /
  falhar a operação / enfileirar para retry>
- Dado sensível enviado ao provedor? Decisão de tratamento: <anonimizar /
  provedor com acordo de confidencialidade / não enviar>

### Migration necessária?
- [ ] Sim — atribuir ao `dba`: `up.sql` + `down.sql`
- [ ] Não (reaproveita schema existente)

### Segredos/credenciais novas?
- [ ] Não
- [ ] Sim — qual: <descrever> — origem: variável de ambiente / Secret K8s
      (nunca valor em texto plano) — atribuir tarefa ao `devops`

### Exige validação contra Postgres real (não apenas SQLite)?
- [ ] Não — query simples, compatível com ambos
- [ ] Sim — motivo: <ex: usa JSONB / ON CONFLICT / window function>

## Contrato de API (se aplicável)
```
POST /api/v1/<recurso>
Request:  { ... }
Response: { ... }
Erros:    400 <motivo>, 404 <motivo>, 409 <motivo>
```

## Alternativas consideradas e rejeitadas
- <alternativa 1> — rejeitada porque <motivo>

## Riscos e mitigação
- <risco técnico ou de segurança> → <como será mitigado>

## Impacto no frontend
- Páginas/componentes novos: <...>
- Hook(s) novo(s): <ex: `useProcesso()`>
- Estado global necessário? <sim/não, qual>
