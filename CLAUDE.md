# Princípios de comportamento dos agentes

> Este projeto tem **18 agentes especializados** em `.claude/agents/`.
> **Nunca usar agente genérico quando existe um especializado para a tarefa.**
> Consulte a seção "Uso obrigatório dos agentes especializados" neste arquivo
> para o mapa completo de tarefas → agente correto.
>
> Derivados das observações de Andrej Karpathy sobre armadilhas comuns de
> LLMs em tarefas de código. Aplicam-se a **todos os agentes** deste projeto,
> em qualquer tarefa. São complementares às regras específicas abaixo —
> não as substituem.

## 1. Pensar antes de codificar

**Código mínimo que resolve o problema. Nada especulativo.**

- Nenhuma feature além do que foi pedido.
- Nenhuma abstração para código de uso único.
- Nenhuma "flexibilidade" ou "configurabilidade" que não foi solicitada.
- Nenhum tratamento de erro para cenários impossíveis.
- Se você escrever 200 linhas e poderia ser 50, reescreva.

Teste: "Um engenheiro sênior diria que isso é overcomplicated?" Se sim, simplifique.

## 2. Mudanças cirúrgicas

**Toque apenas o que você deve. Limpe apenas a sua própria bagunça.**

Ao editar código existente:
- Não "melhore" código, comentários ou formatação adjacentes.
- Não refatore coisas que não estão quebradas.
- Mantenha o estilo existente, mesmo que faria diferente.
- Se notar código morto não relacionado, mencione — não delete.

Ao criar orfãos com suas mudanças:
- Remova imports/variáveis/funções que **suas** mudanças tornaram desnecessários.
- Não remova código morto pré-existente a menos que seja pedido.

Teste: cada linha alterada deve ter rastreamento direto para a solicitação do usuário.

## 3. Execução orientada a objetivos (Goal-Driven)

**Defina critérios de sucesso. Itere até verificar.**

> "LLMs são excepcionalmente bons em iterar até atingir objetivos
> específicos... Não diga o que fazer — dê critérios de sucesso e observe."
> — Andrej Karpathy

Em vez de instruções vagas, transforme tarefas em objetivos verificáveis:

| Instrução vaga | Objetivo verificável |
|---|---|
| "Implemente a validação" | "Escreva testes para inputs inválidos, depois faça-os passar" |
| "Corrija o bug" | "Escreva um teste que reproduza o bug, depois faça-o passar" |
| "Refatore X" | "Garanta que os testes passem antes e depois" |
| "Implemente a feature Y" | "Os critérios Given/When/Then de spec.md devem passar" |

**Para o nosso projeto, os critérios de sucesso já estão definidos:**
- `spec.md` → critérios Given/When/Then e exemplos concretos
- `design.md` → contrato de API e decisões arquiteturais
- `ux.md` → comportamento de tela e acessibilidade
- `tasks.md` → lista de tarefas com verificação

O `dev-fullstack` usa Goal-Driven naturalmente: escreve o teste que
define o critério → implementa → itera até o teste passar. Nunca entrega
sem verificar o critério de sucesso da task correspondente em `tasks.md`.

**Para tarefas multi-etapa, o agente declara um plano breve antes de executar:**
```
1. [Etapa] → verificar: [critério concreto]
2. [Etapa] → verificar: [critério concreto]
3. [Etapa] → verificar: [critério concreto]
```

Critérios de sucesso fortes permitem que o agente itere de forma
independente com mínima interação. Critérios fracos ("faça funcionar")
exigem clarificação constante.

---
## 4. Comentários no código-fonte

**Comentários existem para o programador, não para registrar histórico.**

```
// ❌ Desnecessário — o código já diz isso
// Buscar processo por ID
processo, err := repo.BuscarPorID(ctx, id)

// ❌ Histórico de decisão — pertence ao spec.md, não ao código
// Mudamos de string para UUID após reunião de 15/07

// ✅ Útil — explica o POR QUÊ, não o O QUÊ
// ST_Distance retorna metros só com ::geography — sem isso, retorna graus
dist := ST_Distance(localizacao::geography, ponto::geography)

// ✅ Útil — alerta contra armadilha não óbvia
// Leaflet usa [lat, lon], GeoJSON usa [lon, lat] — inverso!
map.setView([lat, lon], zoom)
```

**Regras:**
- Manter comentários que explicam **por quê**, não o que o código faz
- Manter comentários de API/OpenAPI (anotações `@Summary`, `@Param`, etc.)
- Remover comentários que descrevem o que o código claramente faz
- Remover comentários de "TODO antigo" deixados pelo próprio agente
- **Nunca** deixar decisões de design, mudanças de requisito ou contexto
  de negócio apenas no código-fonte — isso vai no `spec.md`

## 5. spec.md é a fonte de verdade das decisões

**Qualquer mudança de requisito, decisão de design ou ajuste durante a
implementação deve ser refletida no `specs/<feature>/spec.md`.**

Não é suficiente comentar no código. O spec.md é o que o próximo agente
(e o próximo desenvolvedor) vai ler para entender o que o sistema faz.

**Quando atualizar o spec.md:**
- Requisito mudou durante a implementação → atualizar a seção afetada
- Decisão de design foi tomada que afeta o comportamento → registrar
- Algo que estava no spec.md foi descartado → remover (não comentar, não riscar)
- Nova restrição técnica descoberta → adicionar como restrição

**Ao atualizar spec.md: apagar decisões anteriores superadas.**
O spec.md deve refletir o estado atual — não o histórico de como chegou
lá. Isso mantém o documento conciso, consistente e econômico em tokens.

```
// ❌ Errado — histórico acumulado no spec.md
## Decisão de status
~~Inicialmente seria string livre~~
~~Depois cogitamos enum no banco~~
Atual: TEXT com CHECK CONSTRAINT ('aberto','em_andamento','encerrado')

// ✅ Correto — só o estado atual
## Status
TEXT com CHECK CONSTRAINT ('aberto','em_andamento','encerrado')
Motivo: permite extensão por migração sem alterar código da aplicação
```

## 6. Documentação visual obrigatória no spec.md

**Todo spec.md de feature com tela deve ter representação visual.**

O usuário precisa validar o que vai ser construído antes da implementação.
Texto sozinho não é suficiente para telas — use os dois recursos abaixo.

### ASCII art para wireframes de tela

```
┌─────────────────────────────────────────────────────┐
│ Pesquisar Processos                                  │
├──────────────────┬──────────────┬───────────────────┤
│ Status: [______] │ De: [______] │ [🔍 Pesquisar]    │
├──────────────────┴──────────────┴───────────────────┤
│ # │ Descrição          │ Status   │ Ações            │
├───┼────────────────────┼──────────┼──────────────────┤
│ 1 │ Processo Alpha     │ Aberto   │ [✎] [✕]         │
│ 2 │ Processo Beta      │ Fechado  │ [✎] [✕]         │
└───┴────────────────────┴──────────┴──────────────────┘
                                    [< Anterior] [Próx >]
```

Toda tela nova no spec.md inclui wireframe ASCII mostrando:
- Layout geral (filtros, grid, formulário, modal)
- Campos visíveis e seus tipos
- Botões de ação e onde ficam
- Estados relevantes (loading, vazio, erro) se afetarem o layout

### Mermaid.js para fluxos e sequências

Usar quando o fluxo de interação for não-óbvio ou quando houver
múltiplas partes envolvidas (frontend + backend + serviço externo):

```mermaid
sequenceDiagram
  actor U as Usuário
  participant FE as Frontend
  participant BE as Backend
  participant DB as Banco

  U->>FE: clica "Pesquisar"
  FE->>FE: valida filtros
  FE->>BE: GET /api/v1/processos?status=aberto
  BE->>DB: SELECT ... WHERE status = 'aberto'
  DB-->>BE: rows
  BE-->>FE: { data, total, pagina }
  FE->>FE: renderiza grid
Note right of FE: esqueleto enquanto carrega
```

**Quando usar cada um:**
- **ASCII art:** sempre que houver tela (wireframe da UI)
- **Flowchart Mermaid:** fluxo de decisão complexo dentro de um processo
- **Sequence Mermaid:** interação entre mais de dois componentes (usuário + FE + BE + DB)
- **State Mermaid:** ciclo de vida de uma entidade com múltiplos estados



**Não assuma. Não esconda confusão. Mostre os tradeoffs.**

Antes de implementar qualquer coisa:
- Declare as premissas explicitamente. Se incerto, pergunte — não suponha.
- Se existirem múltiplas interpretações, apresente-as. Nunca escolha silenciosamente.
- Se uma abordagem mais simples existir, diga. Questione quando necessário.
- Se algo estiver confuso, pare. Nomeie o que está confuso e pergunte.

Isto vale especialmente para o `analista-requisitos` e o `arquiteto` —
mas todo agente deve parar e perguntar em vez de inventar o que não sabe.


---

## Regras de testes — dados e isolamento

### Fixtures: quem cria, limpa (regra inegociável)

Todo helper de fixture que cria dado real no banco registra a limpeza
**internamente** — nunca a cargo de quem chama.

```
// ❌ Errado — quem chama precisa lembrar
id := criarProcesso(t, db, dados)
defer db.Exec("DELETE FROM processo WHERE id = $1", id)

// ✅ Correto — o fixture limpa ele mesmo
id := criarProcesso(t, db, dados)  // t.Cleanup registrado dentro do helper
```

Aplica-se a: testes de integração Go (`t.Cleanup`), E2E Playwright
(`afterEach`), e qualquer outro framework. A implementação concreta está
nas skills `backend-go` e `e2e-playwright`.

### Variável RUN_TESTS — separar migrate de test

```bash
RUN_TESTS=true    # migrations + seed de teste + testes (ambiente de CI/dev)
RUN_TESTS=false   # apenas migrations (padrão em produção)
```

```yaml
# docker-compose.dev.yml — serviço de teste
services:
  test:
    environment:
      RUN_TESTS: "true"
    command: >
      sh -c 'migrate up &&
             [ "$$RUN_TESTS" = "true" ] && <comando-teste> || echo "testes pulados"'
```

`docker-compose.yaml` (produção) não define `RUN_TESTS` — comportamento
padrão é só migrations. Registrar `RUN_TESTS=false` no `.env.example`.

### Banco de teste isolado

Testes de integração nunca usam o mesmo banco do ambiente dev:
```bash
DATABASE_URL_TEST=postgres://usuario:senha@postgres:5432/nome_banco_test
```
O banco de teste é recriado a cada suíte completa. Fixtures individuais
limpam seus próprios dados via `t.Cleanup` / `afterEach`.

---

# Contexto do Projeto

## Stack
A tecnologia concreta (linguagem, framework, biblioteca de componentes,
banco) **não vive neste arquivo** — vive em `project.config.md`, na raiz
do projeto. Isso é o que torna este CLAUDE.md e os subagents reutilizáveis
entre projetos com stacks diferentes.

O que é fixo, independente da stack escolhida:
- **Estilo arquitetural:** Hexagonal (Ports & Adapters)
- **Princípios de código:** SOLID
- **Padrão de comunicação:** JSON (formato de erro definido em project.config.md)
- **Metodologia:** SDD (Spec-Driven Development, ver seção abaixo)

Antes de qualquer subagent agir, ele lê `project.config.md` e carrega a
skill correspondente em `.claude/skills/<categoria>-<stack>/SKILL.md` para
saber a convenção específica daquela tecnologia (nomes de pasta exatos,
biblioteca de acesso a dados, etc.).

## Estrutura de pastas — conceito hexagonal (agnóstico de linguagem)

A nomenclatura exata de pastas pode variar por linguagem (ver skill da
stack configurada), mas o conceito é sempre o mesmo:

```
domain      → entidades e regras de negócio puras, sem dependência externa
usecase     → orquestra o domínio (1 use case = 1 ação de negócio),
              dividido em command (altera estado) e query (só leitura)
port        → interfaces (ex: UserRepository, NotificationSender, Cache)
adapter     → implementações reais: entrada HTTP, saída para banco,
              cache, serviços externos
```

Regra inegociável, em qualquer linguagem: `domain` e `usecase` nunca
importam/dependem de nada de `adapter`. Dependências sempre apontam para
dentro (Dependency Inversion Principle).

## Estrutura de pastas — frontend (conceito agnóstico de framework)

```
rotas/páginas → conforme convenção do framework escolhido
componentes   → componentes visuais (da biblioteca configurada + compostos)
hooks/dados   → lógica de dados (chamadas à API, estado)
lib/utils     → utilitários puros
```

Regra inegociável, em qualquer framework: componentes de UI não fazem
fetch direto — sempre via camada de dados (hook ou equivalente).

## Metodologia: SDD (Spec-Driven Development)

Toda funcionalidade não-trivial segue o ciclo de 4 fases antes de qualquer código:

1. **Specify** → `specs/<feature>/spec.md` (Analista de Requisitos)
2. **UX** → `specs/<feature>/ux.md` (UX Designer) — apenas quando a feature
   tem interface visual relevante; pular para CRUD trivial sem fluxo
   próprio
3. **Design** → `specs/<feature>/design.md` (Arquiteto)
4. **Tasks** → `specs/<feature>/tasks.md` (Arquiteto, quebra em tarefas atômicas)
5. **Implement + Evidence** → código + `specs/<feature>/evidence.md` (Devs + QA)

Critério para decidir o nível de rigor:
- **Spec completo (4 arquivos):** autenticação, dados sensíveis, integrações externas,
  qualquer coisa difícil de reverter em produção.
- **Spec leve (só spec.md):** CRUD simples, telas de listagem, ajustes visuais.

Nunca pular a fase de `spec.md` — é o que evita ambiguidade na hora de delegar para os subagents.

## Identificadores de entidade (regra inegociável)

**Nunca usar ID numérico sequencial como identificador de entidade exposto
em API, URL ou qualquer resposta ao cliente.** Motivo: previne IDOR
(Insecure Direct Object Reference) — um usuário autenticado não deve
conseguir inferir ou enumerar IDs de outros registros variando um número.

- Chave primária interna: **UUIDv7** (não UUIDv4 puro). UUIDv7 é
  não-sequencial e não-adivinhável (resolve o requisito de segurança), mas
  é ordenável por tempo de criação, o que evita a fragmentação de índice
  que UUIDv4 aleatório causa em Postgres.
- Geração da UUIDv7: na camada de domínio (`/domain`), nunca delegada ao
  banco — assim a entidade já nasce com identidade própria antes de
  persistir, e o use case pode referenciá-la mesmo antes do commit.
- **Importante:** UUID não substitui verificação de autorização. Todo use
  case que busca um recurso por ID deve validar que o ator autenticado tem
  permissão sobre aquele recurso específico — UUID apenas elimina a
  possibilidade de enumeração/adivinhação.
- Nunca usar `SERIAL`/`BIGSERIAL`/`AUTOINCREMENT` como chave primária de
  nenhuma entidade de domínio. Permitido apenas em tabelas puramente
  técnicas e internas que nunca são expostas (ex: tabela de log/auditoria
  interna sem rota de API associada) — avaliar caso a caso com o DBA.

## Gestão de segredos (regra inegociável)

- Nenhuma senha, chave de API, token ou string de conexão em texto plano
  no código-fonte, em arquivo versionado, ou em log.
- Desenvolvimento local: variáveis de ambiente via `.env` (sempre no
  `.gitignore`), com `.env.example` versionado mostrando as chaves
  necessárias sem valores reais.
- Kubernetes: segredos via `Secret` do K8s (nunca em `ConfigMap`), idealmente
  sincronizados de um cofre externo (Vault, Sealed Secrets, ou o que a
  infraestrutura já usa) — nunca um manifesto `Secret` com valor em texto
  plano versionado no git.
- Senhas de usuário da aplicação (se houver autenticação própria): sempre
  hash com `bcrypt` ou `argon2`, nunca armazenadas nem em log de nenhuma
  forma reversível.
- O `security-reviewer` verifica isso proativamente antes de todo merge.

## Estratégia de persistência: SQL customizado, sem ORM pesado

- Princípio universal: usar uma biblioteca leve de mapeamento (struct ↔
  SQL) em vez de um ORM completo com geração automática de query — a
  biblioteca exata para a linguagem configurada está definida na skill da
  stack (`.claude/skills/backend-<stack>/SKILL.md`). Isso resolve o
  problema clássico de ORM gerando query N+1 ou joins ineficientes sem
  você perceber.
- O `port` (interface) nunca expõe detalhe de SQL — apenas o método de
  negócio (`BuscarProcessosPorResponsavel(ctx, responsavelID)`). A query
  SQL específica, otimizada à mão quando necessário, vive inteiramente no
  `adapter`.
- Queries complexas (relatórios, agregações, joins pesados) são SEMPRE SQL
  customizado revisado manualmente — nunca delegadas a query builder
  genérico.
- CRUD simples pode usar os helpers da biblioteca leve escolhida sem
  necessidade de escrever cada query manualmente, mas a porta de saída
  continua sendo SQL real, não um DSL de ORM.

## Bancos por ambiente

- **Produção:** o banco relacional definido em `project.config.md` (padrão
  recomendado: PostgreSQL para aplicação comercial).
- **Desenvolvimento local:** um banco mais leve (ex: SQLite) é aceito para
  iteração rápida, COM A RESSALVA: como usamos SQL customizado (não ORM
  com abstração de dialeto), bancos diferentes têm diferenças reais de
  sintaxe (`RETURNING`, tipos JSON nativo, geração de UUID, comportamento
  de `UPSERT`). Use cases com query complexa ou crítica para o negócio
  devem ter teste de integração rodando contra o banco de produção real
  (via Docker/testcontainers), mesmo em desenvolvimento.
- Toda query customizada que usa sintaxe específica do banco de produção
  deve ser sinalizada no design.md da feature, para o `qa-tester` saber
  que precisa validar contra esse banco antes do merge.

## Migrations (versionamento de banco)

- Ferramenta definida em `project.config.md` (padrão recomendado para Go:
  golang-migrate), compatível com produção e desenvolvimento, arquivos
  pareados de `up` e `down`.
- Toda migration precisa ter o `down.sql` funcional e testado — não é
  opcional. Migration sem rollback não é aceita.
- Migrations vivem em `/internal/adapter/postgres/migrations/`, versionadas
  no git, nunca aplicadas manualmente em produção — sempre via pipeline.

## Observabilidade (obrigatório desde o início — independente de tecnologia)

Estas regras se aplicam a **qualquer** stack de backend. A implementação
técnica específica fica nas skills; as regras e o contrato são definidos aqui.

### O que todo serviço backend deve expor

| Endpoint | Propósito | Obrigatório desde |
|---|---|---|
| `/metrics` (ou equivalente da stack) | Scrape do Prometheus — métricas técnicas e de negócio | Primeiro endpoint da aplicação |
| `/healthz` (ou equivalente) | **Liveness probe** — o processo está vivo? | Junto com `/metrics` |
| `/readyz` (ou equivalente) | **Readiness probe** — as dependências (banco, Redis, fila) estão acessíveis? | Junto com `/metrics` |

**"Equivalente da stack"** significa que Java usa `/actuator/prometheus`,
`/actuator/health/liveness` e `/actuator/health/readiness` — o `dev-docker-compose`
conhece o caminho correto para cada stack e configura o scrape do Prometheus
e os probes do Kubernetes adequadamente. O que nunca muda é a obrigação
de expor os três, independentemente do caminho.

### Métricas mínimas obrigatórias

Implementadas via **middleware global**, aplicado uma única vez na
inicialização do servidor — nunca por endpoint individual:

- **Contador de requisições** por rota, método HTTP e status de resposta
- **Histograma de latência** por rota e método

Métricas de negócio adicionais (ex: contador de processos criados,
gauge de filas pendentes) são decididas na fase de Design pelo arquiteto
e registradas em `design.md` — nunca adicionadas por impulso durante
a implementação.

### Nomes de métrica: compatíveis com OpenTelemetry

Mesmo usando o cliente Prometheus nativo agora, os nomes e labels seguem
as convenções do OpenTelemetry. Isso garante que uma eventual migração
futura para OTel SDK seja troca de exporter, não reescrita de todo o
código de instrumentação.

### Configuração do destino (variável de ambiente)

```
PROMETHEUS_PUSHGATEWAY_URL=http://pushgateway:9091
# Deixar vazio para o Prometheus fazer pull via scrape (padrão em K8s)
# Múltiplos destinos separados por vírgula são suportados
```

### Implementação por stack (ver skill correspondente)

| Stack | Lib recomendada | Endpoint Prometheus | Liveness | Readiness |
|---|---|---|---|---|
| Go + Gin | `prometheus/client_golang` + middleware | `/metrics` | `/healthz` | `/readyz` |
| Python + FastAPI | `prometheus-fastapi-instrumentator` | `/metrics` | `/healthz` | `/readyz` |
| Java + Spring Boot | Actuator + Micrometer | `/actuator/prometheus` | `/actuator/health/liveness` | `/actuator/health/readiness` |
| PHP + Laravel | `spatie/laravel-prometheus` + middleware | `/metrics` | `/up` | `/ready` |
| Nova stack | pesquisar lib Prometheus da linguagem | `/metrics` | `/healthz` | `/readyz` |

## Documentação de API (obrigatório — independente de tecnologia)

Estas regras se aplicam a **qualquer** stack de backend. A implementação
técnica específica fica nas skills; as regras são definidas aqui.

### Princípio: gerada pelo código, não escrita à mão

A especificação OpenAPI é **gerada automaticamente** a partir de anotações
no código (comentários, decorators, type hints) — nunca escrita à mão em
YAML. Isso garante que o contrato nunca desincronize do código real.

O `tech-writer` é responsável por rodar o comando de exportação após
cada mudança de endpoint e versionar o resultado em `docs/openapi.yaml`.
O arquivo versionado é o que os subagents `dev-frontend` e `dev-ia` usam
como referência — nunca inferem o contrato lendo código-fonte.

### O que toda API expõe

| Endpoint | Propósito |
|---|---|
| `/openapi.json` (ou equivalente) | Especificação máquina-legível |
| `/swagger` (ou equivalente) | UI interativa para testar endpoints em desenvolvimento |

### Regras de contrato

- Mudança **breaking** (campo removido, tipo alterado, comportamento de
  erro mudado) exige decisão explícita do arquiteto: versionar (`/api/v2`)
  ou depreciar com prazo e caminho de migração. Nunca passa silenciosa.
- Toda rota tem pelo menos: `summary`, código de sucesso com schema de
  resposta, e todos os códigos de erro possíveis com schema de erro.
- O formato de erro segue o padrão definido em `project.config.md` em
  todas as rotas — nunca cada endpoint retornando formato diferente.

### Exportação e versionamento (tech-writer executa após cada mudança)

```bash
# O comando específico vem da skill da stack:
# Go:     swag init -g cmd/api/main.go -o docs/
# Python: python -c "import yaml; from app.main import app; ..."
# Java:   ./mvnw springdoc-openapi:generate
# PHP:    php artisan l5-swagger:generate
```

### Implementação por stack (ver skill correspondente)

| Stack | Lib recomendada | UI Swagger | openapi.json |
|---|---|---|---|
| Go + Gin | `swaggo/swag` + comentários `@Summary` | `/swagger/index.html` | `/swagger/doc.json` |
| Python + FastAPI | **nativo** — zero configuração extra | `/swagger` | `/openapi.json` |
| Java + Spring Boot | Springdoc OpenAPI 2.x | `/swagger` | `/openapi.json` |
| PHP + Laravel | `l5-swagger` | `/api/documentation` | `/api/documentation.json` |
| Nova stack | pesquisar lib OpenAPI da linguagem | `/swagger` | `/openapi.json` |

## Padrões arquiteturais adotados desde já

### CQRS-leve (sem banco separado, sem broker)

**Organização de pastas por entidade dentro de command/ e query/:**

```
usecase/
  command/
    processo/
      criar_processo.go     ← CriarProcessoUseCase
      atualizar_processo.go ← AtualizarProcessoUseCase
      excluir_processo.go   ← ExcluirProcessoUseCase
    usuario/
      criar_usuario.go
  query/
    processo/
      listar_processos.go   ← ListarProcessosUseCase
      buscar_processo.go    ← BuscarProcessoUseCase
    usuario/
      listar_usuarios.go
```

Cada entidade de domínio tem sua própria subpasta dentro de `command/` e
`query/`. Isso mantém os use cases agrupados por contexto conforme o
projeto cresce — sem dezenas de arquivos soltos na pasta raiz de command
ou query. Quando uma subpasta tiver apenas um arquivo, crie-a mesmo assim:
a consistência supera a conveniência de não criar a pasta.
- Dentro de cada módulo de domínio, separe explicitamente **comandos**
  (alteram estado: `Criar`, `Atualizar`, `Cancelar`) de **consultas**
  (somente leitura: `Buscar`, `Listar`). Use cases de comando vivem em
  `/usecase/command`, use cases de consulta em `/usecase/query`.
- Consultas podem ler de uma projeção/view otimizada (ex: uma `VIEW` SQL
  ou uma tabela desnormalizada) quando o `arquiteto` identificar que a
  leitura tem um formato muito diferente da escrita — mas **mesmo banco,
  mesma transação**. Isso não é CQRS com bancos separados; é só
  organização de código que prepara o terreno para separar de verdade se
  um dia for necessário.
- Gatilho para evoluir para CQRS "pesado" (banco de leitura separado):
  quando uma consulta específica causar contenção real e medível no banco
  de escrita (visível nas métricas Prometheus de latência) — não antes.

### Domain Events (in-process, sem broker ainda)
- Toda mudança relevante de estado em uma entidade de domínio emite um
  evento interno (ex: `ProcessoCriado`, `UsuarioAtivado`), processado
  dentro da mesma transação/processo — sem fila externa por enquanto.
- Os eventos vivem em `/domain/event`, e use cases publicam via uma
  interface simples (`EventPublisher`) cuja implementação inicial só
  invoca handlers em processo (ex: atualizar uma métrica, invalidar cache).
- Isso prepara a migração futura para mensageria real: quando o gatilho
  abaixo for atingido, troca-se a implementação de `EventPublisher` para
  publicar num broker, sem alterar o domínio nem os use cases.

### Cache (Redis, padrão cache-aside)
- Usado para consultas (`/usecase/query`) custosas ou lidas com muita
  frequência e baixa volatilidade — nunca para dado que muda a cada
  escrita.
- Padrão: cache-aside (a aplicação consulta o cache; se vazio, busca no
  banco e popula o cache) — nunca write-through nem cache como fonte de
  verdade.
- Interface `Cache` fica em `/port`; implementação Redis em `/adapter`.
  Use case nunca importa cliente Redis diretamente.
- Toda chave de cache tem TTL explícito — proibido cache sem expiração.
- Invalidação: ao processar um comando que altera uma entidade, o próprio
  use case de comando invalida as chaves de cache relacionadas (via Domain
  Event, idealmente) — nunca depende de TTL como única estratégia de
  invalidação para dado que mudou.

### pgvector e PostGIS (extensões Postgres)
- Habilitadas via migration (`CREATE EXTENSION IF NOT EXISTS vector;` /
  `postgis;`) apenas quando uma feature concreta precisar (busca
  semântica → pgvector; dados geoespaciais → PostGIS) — não habilitar
  "por padrão" em todo projeto novo sem caso de uso real registrado em
  spec.md.
- Índices de pgvector (ex: HNSW) e de PostGIS (GiST) são responsabilidade
  do `dba`, com justificativa de uso em design.md.

### Idempotência em comandos
- Toda rota de comando que pode ser reenviada por retry de rede ou duplo
  clique (criação de recurso, pagamento, envio) aceita um header
  `Idempotency-Key`. O handler verifica se aquela chave já foi processada
  (cache ou tabela dedicada) antes de executar o use case novamente.
- Isso é barato de implementar agora e evita a maior parte dos bugs de
  duplicação que apareceriam quando mensageria/retry automático entrarem
  em cena.

### Circuit Breaker em chamadas externas
- Toda chamada a um serviço externo (ex: api-externa, qualquer API de
  terceiro) passa por um circuit breaker — se o serviço externo começar a
  falhar repetidamente, o breaker "abre" e falha rápido em vez de deixar
  requisições acumularem esperando timeout.
- Implementado na camada de `/adapter` que faz a chamada externa, nunca
  dentro do `/usecase` (que não deve saber que existe um breaker, só que a
  chamada pode falhar).

## Campos base obrigatórios em toda entidade (regra inegociável)

Toda tabela que representa uma entidade de domínio nasce com estes campos,
sem exceção:
- `id UUID PRIMARY KEY` — UUIDv7, gerado na aplicação (ver regra de
  identificadores acima)
- `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`
- `atualizado_em TIMESTAMPTZ` — atualizado pelo use case de comando a cada
  modificação, nunca via trigger de banco silenciosa
- `excluido_em TIMESTAMPTZ` — nulo enquanto o registro está ativo (ver
  regra de deleção lógica abaixo)

## Deleção lógica (regra inegociável, sem exceção)

**Nenhuma entidade de domínio é removida com `DELETE` real.** Toda
"exclusão" é lógica: o use case de comando seta `excluido_em = now()` na
linha, e o dado permanece no banco.

- Toda query de leitura (`/usecase/query`) filtra `WHERE excluido_em IS NULL`
  por padrão — isso fica centralizado no adapter de persistência (ex: um
  helper ou view que já aplica esse filtro), nunca repetido manualmente em
  cada query e esquecido em alguma.
- Justificativa: auditoria, recuperação de erro do usuário, e em vários
  domínios (como processos administrativos) é literalmente exigido manter
  o histórico mesmo de itens "excluídos".
- Restrição de unicidade (`UNIQUE`) precisa considerar isso: um campo
  único como "email" não pode bloquear cadastro novo só porque existe um
  registro excluído logicamente com o mesmo valor — normalmente isso
  significa um índice único parcial (`WHERE excluido_em IS NULL`) em vez
  de `UNIQUE` simples na coluna.
- Exceção possível, avaliada caso a caso pelo `dba`: dado com obrigação
  legal de eliminação real (ex: LGPD, direito ao esquecimento) — nesse
  caso a decisão e a justificativa vão registradas em design.md, não
  decididas ad-hoc no código.

## Busca e pesquisa (Postgres nativo por padrão, Elasticsearch sob gatilho)

- **Padrão para qualquer funcionalidade nova:** busca textual via recursos
  nativos do Postgres (`tsvector`/`tsquery` + índice GIN, com coluna
  gerada automaticamente). Isso cobre a grande maioria dos casos de busca
  de um CRUD/listagem sem exigir infraestrutura nova.
- **Gatilho objetivo para considerar Elasticsearch** (registrado no
  Roadmap de Maturidade abaixo, não implementado por padrão): volume de
  documentos na casa de milhões combinado com necessidade real de
  relevância de busca sofisticada (ranking BM25, busca facetada, tolerância
  a erro de digitação em escala) — não "porque todo sistema de busca usa
  Elasticsearch".
- Busca semântica (significado, não palavra-chave exata) continua sendo
  pgvector, já adotado — Postgres permite combinar busca textual e
  semântica na mesma query quando fizer sentido (busca híbrida).

## Layout padrão da aplicação (scaffolding único, no início do projeto)

Toda aplicação nasce com esta estrutura de UI, criada como tarefa de
infraestrutura na primeira funcionalidade do projeto (o `arquiteto`
inclui isso em `tasks.md` automaticamente se detectar que o AppShell
ainda não existe):

- **Rota raiz (`/`):** página de login — não a aplicação.
- **Shell autenticado** (ex: `/app/*` ou grupo de rotas equivalente no
  framework configurado): layout com três regiões fixas:

  - **Header (cabeçalho):**
    - Área para logo à esquerda
    - Título do sistema ao lado do logo
    - Botão para mostrar/esconder o menu lateral (toggle)
    - Área à direita para informações do usuário logado (nome, avatar, logout)

  - **Menu lateral (sidebar) — hierárquico:**
    O menu é **hierárquico**, com dois níveis:
    - **Grupos** (nível 1): categorias que agrupam funcionalidades relacionadas.
      Ex: "Cadastros", "Financeiro", "Relatórios", "Administração",
      "Tabelas Acessórias"
    - **Itens** (nível 2): funcionalidades dentro de cada grupo, com link
      para a rota correspondente
    - Grupos são expansíveis/recolhíveis (accordion)
    - O grupo e o item ativos são destacados visualmente
    - Grupos e itens definidos em `specs/00-visao-produto.md` e atualizados
      conforme novas funcionalidades entram no projeto
    - Quando o menu está recolhido (toggle acionado): mostrar apenas os
      ícones dos grupos, sem texto; ao passar o mouse, mostrar tooltip com
      o nome

  - **Rodapé (footer):**
    - Fixo na parte inferior, fora da área de scroll do conteúdo
    - Conteúdo mínimo: nome do sistema + versão + ano + órgão/empresa
    - Para sistemas do governo (DSGOV): seguir o padrão de rodapé do
      Padrão Digital de Governo (links obrigatórios: Acesso à Informação,
      Participe, Auditorias, Ouvidoria, Perguntas Frequentes,
      Termos de Uso)
    - Para sistemas privados: mínimo de nome + versão; pode incluir links
      de ajuda, política de privacidade

  - **Indicador de navegação:** barra de progresso no topo da página
    (NProgress ou equivalente) disparada ao clicar em qualquer link do menu
  - **Sistema de toast:** `Toaster`/`SnackBar` registrado globalmente no
    root, com wrapper `notify.sucesso()`, `notify.erro()`, `notify.aviso()`,
    `notify.info()` disponível para toda a aplicação

### Estrutura de componentes do AppShell

```
components/
  shell/
    app-shell.tsx         # layout root: combina header + sidebar + footer
    app-header.tsx        # logo + título + toggle do menu + info do usuário
    app-sidebar.tsx       # menu hierárquico (accordion de dois níveis)
    app-footer.tsx        # rodapé fixo
    sidebar-nav.tsx       # item de navegação (um item por funcionalidade)
    sidebar-group.tsx     # grupo expansível do menu hierárquico
```

### Exemplo de configuração do menu hierárquico

```ts
// Definido em um arquivo de configuração de navegação, nunca hardcoded
// nos componentes — permite atualizar o menu sem tocar em componente
export const NAV_CONFIG: NavGroup[] = [
  {
    label: "Cadastros",
    icon: "users",
    items: [
      { label: "Clientes", path: "/app/clientes" },
      { label: "Fornecedores", path: "/app/fornecedores" },
    ]
  },
  {
    label: "Tabelas Acessórias",
    icon: "table",
    items: [
      { label: "Categorias", path: "/app/categorias" },
      { label: "Status", path: "/app/status" },
    ]
  }
];
```

## Padrão universal de UX — independente de tecnologia

Estas regras definem o comportamento esperado pelo usuário, independentemente
do framework ou biblioteca de componentes usados. O `ux-designer` as aplica
ao projetar as telas; o `dev-frontend` as implementa; o `code-reviewer` as
verifica. Nenhuma skill de tecnologia específica pode contradizer estas regras.

### Grid/listagem: comportamento obrigatório

**1. Estrutura da tela de listagem**
- A tela começa mostrando a **área de filtro** — sempre visível, sempre no
  topo.
- O grid de resultados **não aparece até o usuário clicar em "Pesquisar"**.
  A tela não executa nenhuma consulta ao carregar. Isso é comportamento
  esperado, não limitação técnica.
- Após clicar em "Pesquisar": grid aparece com os resultados, botões de
  "Editar" e "Excluir" em cada linha, controle de paginação visível.
- Botão "Novo" sempre visível na tela.

**2. Ordenação**
- Todo cabeçalho de coluna marcado como ordenável é **clicável**.
- 1º clique = crescente. 2º clique na mesma coluna = decrescente.
  Nunca há um 3º estado "sem ordenação" — sempre existe uma ordenação ativa.
- Ao clicar em **outra** coluna: essa passa a ser a ativa, começando em
  crescente.
- A coluna e direção da ordenação ativa são visualmente destacadas no
  cabeçalho (ícone de seta ↑ ou ↓).
- Toda tela de listagem tem uma **ordenação padrão definida** pelo `ux-designer`
  junto com o dono do produto — nunca "sem ordenação padrão".

**3. Persistência do estado no armazenamento local (navegador)**
Tudo o que o usuário configurou na tela é **salvo no armazenamento local do
navegador** (localStorage ou equivalente) e **restaurado automaticamente**
quando ele retorna à tela — sem precisar reconfigurar:

| O que persiste | Restaurado quando |
|---|---|
| Valores dos campos de filtro | Ao abrir a tela novamente |
| Coluna de ordenação ativa | Ao abrir a tela novamente |
| Direção (crescente/decrescente) | Ao abrir a tela novamente |
| Tamanho de página escolhido | Ao abrir a tela novamente |
| Número da página atual | Ao abrir a tela* |

*Se o total de resultados for menor que a página salva, ir para a última
página válida.

O que **não** persiste no localStorage: o resultado do grid em si — ao
retornar à tela, o sistema refaz a consulta com os filtros restaurados,
garantindo dados sempre atualizados.

**4. Comportamento ao mudar filtros**
Quando o usuário altera qualquer filtro e clica em "Pesquisar":
- A paginação volta para a página 1.
- A ordenação é mantida (o usuário não perde a ordenação escolhida ao
  refinar o filtro).

---

### Autocomplete/Combobox: comportamento obrigatório

**Quando usar:** sempre que o campo representar uma entidade com código +
descrição/nome (ex: categoria, status, tipo, unidade de medida, cidade).
Nunca usar `<select>` simples com lista estática para esse caso — o
autocomplete é obrigatório.

**Comportamento esperado:**

1. **Busca enquanto digita:** ao digitar qualquer texto, o componente faz
   uma busca por semelhança (LIKE `%texto%` ou equivalente) nos registros
   já cadastrados e exibe as sugestões em um dropdown. A busca acontece
   tanto no código quanto na descrição/nome.

2. **Seleção:** ao clicar em uma sugestão, o componente preenche o campo
   com o valor selecionado e fecha o dropdown. O sistema internamente
   guarda o **id/código** do item — o que o usuário vê é a descrição.

3. **Criação inline (sem sair do formulário):** se o texto digitado não
   corresponder a nenhum item cadastrado, o dropdown mostra uma opção
   especial no final da lista:
   ```
   ─────────────────────
   + Criar "texto digitado"
   ```
   Ao clicar nessa opção, o sistema:
   - Abre um modal/dialog pequeno para confirmar e completar o novo item
     (código gerado automaticamente ou preenchido pelo usuário, conforme
     regra da entidade)
   - Salva o novo item via API **sem fechar o formulário principal**
   - Preenche o campo automaticamente com o item recém-criado
   - Retorna o foco ao formulário principal

4. **Limpeza:** o campo tem um botão "×" para limpar a seleção.

5. **Acessibilidade:** o componente segue o padrão WAI-ARIA
   `combobox` + `listbox`, com navegação por teclado (setas para navegar
   nas sugestões, Enter para selecionar, Escape para fechar).

6. **Estado vazio:** se a busca não retornar resultados E a criação inline
   estiver habilitada para esta entidade, mostrar apenas a opção de criar.
   Se a criação inline não for aplicável, mostrar "Nenhum resultado encontrado".

**Backend correspondente:** o adapter que serve as sugestões deve:
- Receber o texto digitado como parâmetro de busca
- Retornar `{ id, codigo, descricao }` por item
- Limitar a 20 sugestões por padrão (configurável)
- Usar índice no campo de busca (responsabilidade do `dba`)

**Criação inline e permissões:** a opção de criar novo item só aparece se
o usuário tem permissão para criar registros naquela entidade (verificado
via ABAC). Sem permissão, o dropdown mostra apenas as sugestões existentes.

#### Componentes reutilizáveis (regra universal de frontend)

**Princípio:** antes de escrever qualquer componente de UI, pergunte se
ele poderia ser usado em outra feature. Se sim, nasce em `shared/` —
organizado por categoria, não solto na raiz.

**Estrutura de `shared/` (vale para Next.js e Angular):**

```
shared/
  ui/       ← componentes visuais sem lógica de domínio
  forms/    ← componentes de formulário reutilizáveis
  hooks/    ← hooks sem vínculo com domínio (Next.js)
  pipes/    ← pipes reutilizáveis (Angular)
```

| Categoria | O que vai aqui |
|---|---|
| `shared/ui/` | StatusBadge, Skeleton, EmptyState, ErrorState, Modal genérico, ConfirmDelete, **LoadingButton** |
| `shared/forms/` | AutocompleteCreate, RichTextEditor |
| `shared/hooks/` | useLocalStorage, usePagination, useDebounce (Next.js) |
| `shared/pipes/` | pipes reutilizáveis (Angular) |
| `features/<entidade>/` | Tudo específico de uma entidade: form, list, hooks de domínio |
| `layout/` | AppShell, Header, Sidebar, Footer |

**Regras:**
- Componente `shared/` **nunca** importa de `features/`
- Componente `shared/` não conhece o domínio: recebe dados via props/inputs, emite eventos via callbacks/outputs
- Código de UI copiado entre features → extrair para `shared/` com props que cubram as variações
- Quando uma categoria de `shared/` crescer demais, criar subcategoria (ex: `shared/ui/feedback/` para estados de loading/erro)

### Indicador global de carregamento (barra superior + item/botão com loading)

A barra de progresso fina no topo não é apenas um indicador de navegação —
é o **indicador global de "sistema trabalhando"**. Aparece em três situações:

| Situação | Barra no topo | Elemento |
|---|---|---|
| Clique em link de menu | ✅ inicia | ✅ spinner no item |
| Qualquer link de navegação (`<Link>`, `<a>`) | ✅ inicia | — |
| Chamada à API (pesquisar, salvar, carregar dados) | ✅ inicia | ✅ LoadingButton spinner |
| Resposta recebida (sucesso ou erro) | ✅ completa e some | ✅ volta ao normal |

**O que não dispara:** operações instantâneas — validação local de campo,
toggle de estado local, abrir modal sem fetch.

**Dois indicadores obrigatórios juntos:**

1. **Barra no topo** — feedback global. Aparece imediatamente, anima
   continuamente (barra parada gera mais ansiedade que barra em movimento),
   some ao concluir.

2. **Estado no elemento clicado** — feedback contextual. Item de menu com
   spinner, botão com `LoadingButton`. Impede duplo clique.

**Implementação via interceptor HTTP automático + funções manuais:**
A barra é controlada globalmente. Toda chamada HTTP dispara `loadingStart()`
automaticamente (via interceptor) e `loadingDone()` ao completar. Para
casos sem HTTP (navegação de rota), chamadas manuais. A implementação
concreta vem da skill de frontend da stack configurada.

**Acessibilidade:** `aria-busy="true"` no elemento em loading.
A barra tem `aria-hidden="true"` — o estado do elemento já comunica.

### Sistema de notificações toast (obrigatório)

Toda ação do usuário que gera resultado (sucesso, erro, aviso) deve ser
comunicada via toast — mensagem temporária no canto superior direito que
aparece automaticamente e desaparece após alguns segundos.

**Três tipos, sempre com ícone:**

| Tipo | Cor | Ícone | Quando usar |
|---|---|---|---|
| **Sucesso** | Verde | ✅ | Criação, edição, exclusão bem-sucedida |
| **Erro** | Vermelho | ❌ | Falha de API, erro de validação do servidor, timeout |
| **Aviso** | Amarelo | ⚠️ | Ação parcialmente concluída, aviso de prazo, dado desatualizado |
| **Info** | Azul | ℹ️ | Informação neutra, processo iniciado em background |

**Comportamento:**
- Posição: canto superior direito, fora do fluxo do conteúdo
- Auto-dismiss: 4s (sucesso/info), 6s (aviso), 8s (erro — dá tempo de ler)
- Empilhável: múltiplos toasts aparecem em fila
- Clicável para fechar antes do timeout
- Acessível: `role="status"` (sucesso/info/aviso) ou `role="alert"` (erro)

**Quando usar toast vs. mensagem inline:**
- Toast: resultado de ação assíncrona (salvar, deletar, enviar)
- Mensagem inline no formulário: erro de validação de campo específico
- Toast de erro NÃO substitui o `aria-describedby` no campo com erro

A implementação específica vem da skill de frontend da stack configurada.

## Editor de texto rico: quando usar e como tratar

**Quando usar:** o `ux-designer` avalia campo a campo se o conteúdo
justifica formatação rica. Candidatos típicos:

| Tipo de campo | Editor rico? | Justificativa |
|---|---|---|
| Descrição longa, corpo de e-mail, anúncio, conteúdo editorial | ✅ Sim | O usuário precisa de negrito, listas, links |
| Observação / comentário curto | ⚠️ Avaliar | Depende do volume e da audiência |
| Nome, código, título, número | ❌ Não | Campo estruturado — formatação não agrega |
| Campo de filtro / busca | ❌ Nunca | Formatação não faz sentido aqui |

Quando o `ux-designer` aprovar o uso, ele registra em `ux.md`:
- Qual campo usa editor rico
- Nível de formatação necessário: básico (negrito, itálico, listas,
  links) ou avançado (tabelas, imagens inline, código)
- Formato de armazenamento: HTML ou Markdown

**Formato de armazenamento — escolha uma e use em todo o projeto:**
- **HTML:** renderização direta, mais rico, requer sanitização rigorosa
  no backend (ver regra de segurança abaixo)
- **Markdown:** mais seguro, mais portável, requer parser na exibição.
  Recomendado para projetos novos sem requisito explícito de HTML.

**Segurança — obrigatório no backend (XSS):**
Todo conteúdo de editor rico salvo no banco e depois renderizado como
HTML é um vetor de XSS se não for sanitizado. Regras inegociáveis:
- O backend sanitiza o HTML antes de persistir — nunca depender do
  frontend para isso
- Usar lib de sanitização (Go: `bluemonday`; Python: `bleach`;
  Java: `jsoup`; PHP: `HTMLPurifier`)
- Allowlist de tags e atributos — nunca blocklist (bloquear `<script>`
  não é suficiente; usar allowlist de tags permitidas)
- `target="_blank"` em links: adicionar `rel="noopener noreferrer"`
  automaticamente na sanitização

**Acessibilidade:**
- O editor deve ser operável por teclado
- A área de edição tem `role="textbox"` e `aria-multiline="true"`
- Botões da toolbar têm `aria-label` descritivo
- A lib escolhida nas skills (TipTap, Quill, ngx-quill) já implementa
  isso — não usar `<div contenteditable>` puro

## Padrão de CRUD: filtro + grid (comportamento completo)

Toda tela de listagem de uma entidade segue esta estrutura:

### Estrutura da tela (sequência obrigatória)

1. **Área de filtro** no topo — sempre presente, sempre visível.
   O `ux-designer` pergunta ao dono do produto quais campos filtrar.
   Os filtros começam **pré-preenchidos** com os valores da última pesquisa
   (restaurados do localStorage ao carregar a tela).

2. **Botão "Pesquisar"** aciona a consulta e popula o grid.
   O grid **só aparece após clicar em Pesquisar** — a tela não executa
   consulta automática ao carregar, evitando busca desnecessária e
   permitindo que o usuário ajuste os filtros antes.

3. **Grid de resultados** com paginação e ordenação:
   - Cabeçalhos de coluna clicáveis (1º clique = crescente, 2º = decrescente)
   - Controle de paginação visível
   - Cada linha tem botões **Editar** e **Excluir**

4. **Botão "Novo"** sempre visível na tela, abre o formulário de criação.

### Estado persistido no localStorage (por tela, por funcionalidade)

**Tudo que o usuário configura** na tela é salvo e restaurado:

| O que salvar | Chave sugerida | Restaurado quando |
|---|---|---|
| Valores dos campos de filtro | `grid-state:<entidade>:filtros` | Ao retornar à tela |
| Coluna de ordenação ativa | `grid-state:<entidade>:sort` | Ao retornar à tela |
| Direção (asc/desc) | `grid-state:<entidade>:order` | Ao retornar à tela |
| Tamanho de página escolhido | `grid-state:<entidade>:pageSize` | Ao retornar à tela |
| Página atual | `grid-state:<entidade>:page` | Ao retornar à tela* |

*A página é restaurada, mas se o total de resultados for menor (filtro
mudou), clampar para a última página válida.

**Quando salvar:** a cada alteração de qualquer desses valores, imediatamente.
**Quando restaurar:** ao montar o componente da tela.
**O que NÃO salvar:** o resultado do grid em si (sempre refetched ao
abrir a tela com os filtros restaurados, garantindo dados atualizados).

### Formulário de criação/edição: independente de contêiner

O componente de formulário é **autônomo** — recebe os dados e callbacks
via props/inputs (`initialData`, `onSubmit`, `onCancel`) e não sabe se
está em página ou modal. A decisão de página-vs-modal fica no `ux.md`.

### Menu hierárquico: onde entidades e tabelas acessórias ficam

As funcionalidades principais ficam em grupos de nível 1 do menu lateral
(ex: "Cadastros", "Financeiro"). Tabelas acessórias (categorias, tipos,
status, configurações) ficam agrupadas em um grupo dedicado no menu,
normalmente chamado "Tabelas Acessórias" ou "Configurações" — nunca
misturadas com as funcionalidades principais no mesmo grupo.

## Roadmap de maturidade arquitetural (próxima fase, sob gatilho — não implementar agora)

| Padrão | Gatilho objetivo para adotar |
|---|---|
| **Outbox Pattern** | No momento em que mensageria real for introduzida — é pré-requisito, não opcional, para evitar o problema clássico de "gravei no banco mas não publiquei o evento" |
| **Mensageria (NATS/RabbitMQ/Kafka)** | Quando houver processamento assíncrono real e mensurável (ex: geração de relatório pesado, envio em lote) que hoje bloqueia a requisição HTTP |
| **Event Sourcing completo** | Para um domínio específico de alta necessidade de auditoria/histórico (ex: trâmite de um processo) — nunca para a aplicação inteira de uma vez |
| **Saga / orquestração de transação distribuída** | Quando existir mais de um serviço deployável de fato, com necessidade de coordenar operação que atravessa ambos |
| **CQRS "pesado" (banco de leitura separado)** | Quando métrica real mostrar contenção no banco de escrita causada por carga de leitura |
| **Elasticsearch (busca dedicada)** | Volume de documentos na casa de milhões + necessidade real de relevância de busca sofisticada que a busca nativa do Postgres não atende mais — medir antes de migrar, não assumir |
| **Paginação por cursor (em vez de page/offset)** | Tabela específica medida como lenta em páginas avançadas (offset alto) — não migrar especulativamente toda listagem do sistema de uma vez |

Ao atingir um desses gatilhos, registrar a decisão como ADR em
`specs/<feature>/design.md` antes de implementar — nunca adotar o padrão
"porque parece a coisa certa a fazer" sem o gatilho objetivo presente.

## Uso obrigatório dos agentes especializados

**Nunca usar agente genérico (general-purpose) quando existe um agente
especializado para a tarefa.** Os agentes deste projeto foram construídos
com contexto, regras e skills específicas — um agente genérico ignora tudo
isso e entrega resultado de qualidade inferior.

```
❌ Errado: usar agente genérico para implementar uma feature
✅ Correto: usar dev-fullstack (com as skills da stack carregadas)

❌ Errado: usar agente genérico para revisar segurança
✅ Correto: usar security-reviewer (checklist OWASP integrado)

❌ Errado: usar agente genérico para escrever um spec.md
✅ Correto: usar analista-requisitos (wireframe ASCII + GWT + exemplos)
```

**Mapa de tarefas → agente correto:**

| Tarefa | Agente |
|---|---|
| Coletar requisitos, criar spec.md | `analista-requisitos` |
| Projetar UX, filtros, acessibilidade | `ux-designer` |
| Identificar oportunidades de IA | `ai-consultor` |
| Definir arquitetura, design.md, tasks.md | `arquiteto` |
| Implementar feature (banco + backend + frontend) | `dev-fullstack` |
| Implementar feature de IA/LLM | `dev-ia` |
| Implementar autenticação e ABAC | `dev-auth` |
| Implementar auditoria | `dev-auditoria` |
| Implementar servidor MCP | `dev-mcp` |
| Configurar Docker Compose e ambiente local | `dev-docker-compose` |
| Gerar manifests K8s, CI/CD e ArgoCD | `dev-kubernetes` |
| Validar e consolidar migrations, gerar release.sql | `dba` |
| Revisar segurança (OWASP) | `security-reviewer` |
| Revisar qualidade e arquitetura | `code-reviewer` |
| Executar testes e gerar evidence.md | `qa-tester` |
| Teste de carga | `load-tester` |
| Gerar documentação e OpenAPI | `tech-writer` |
| Auditar projeto existente | `auditor-projeto` |

**Quando um agente encontrar algo que não sabe:**
O agente especializado pode e deve buscar informação adicional — pesquisar
na web, ler arquivos do projeto, perguntar ao usuário — **mas continua
sendo o agente especializado executando a tarefa**. Nunca transferir a
execução para um agente genérico.

## Orquestração dos subagents (papel da thread principal)

### Modelo preferido: dev-fullstack por funcionalidade

O `dev-fullstack` implementa uma feature completa do banco à tela — migration,
use case com teste TDD, handler, hook e componente — sem coordenar com outro
agente de desenvolvimento da mesma feature. Paralelismo acontece entre features:

```
feature-A → dev-fullstack  ←── em paralelo, sem dependência entre si
feature-B → dev-fullstack
feature-C → dev-fullstack
```

### Quando usar dev-backend / dev-frontend separados
- Feature puramente de backend sem tela (job, worker, webhook)
- Refatoração de UI sem mudança de API
- Especialistas mantêm fluxo dedicado: `dev-ia`, `dev-auth`, `dev-auditoria`

### Testes no fluxo do dev-fullstack
- **Unitários (use case):** `dev-fullstack` escreve ANTES do código (TDD)
- **E2E:** `dev-fullstack` escreve os testes Playwright ao implementar
- **Validação:** `qa-tester` executa os testes e gera `evidence.md`

### Sequencial obrigatório
```
analista-requisitos → ux-designer → arquiteto → dev-fullstack(s)
        ↓
⛔ PARE — usuário testa manualmente no ambiente de desenvolvimento
        ↓ (usuário aprova)
security-reviewer + code-reviewer (em paralelo)
        ↓
qa-tester → evidence.md
        ↓
⛔ PARE — aprovação final do usuário
        ↓
tech-writer → devops
```

**Nunca avançar para revisão sem confirmação explícita do usuário.**
Revisões de código que vai ser reescrito são desperdício.

### Paralelizável
- Múltiplos `dev-fullstack` para features independentes
- `security-reviewer` e `code-reviewer` entre si (depois da validação do usuário)

## Convenções de nomenclatura

Pesquisadas e validadas contra o consenso atual da comunidade, não
convenção arbitrária. Detalhamento completo, com exemplos, em
`examples/naming-conventions/`:
- `database.md` — banco de dados (snake_case, sem prefixo de tipo, PK `id`)
- `backend-go.md` — Go (PascalCase/camelCase, sem prefixo `I` em interface)
- `frontend-nextjs-typescript.md` — Next.js/TypeScript/React (kebab-case
  em arquivo, PascalCase em componente, sem prefixo `I` em tipo)

Regra que vale para qualquer linguagem nova adicionada ao projeto: ao
criar uma skill para uma stack nova, criar também o arquivo de convenção
de nomenclatura correspondente em `examples/naming-conventions/`, e linkar
da skill — nunca inventar convenção ad-hoc no meio de uma tarefa.

## Status do projeto (continuidade entre sessões)

O arquivo `specs/_status.md` funciona como o quadro de andamento do
projeto — qual funcionalidade está em qual fase (visão, spec, ux, design,
tasks, implementando, qa, concluída). Toda sessão nova do Claude Code deve
consultar esse arquivo antes de assumir que está começando do zero, e todo
subagent atualiza a linha correspondente ao terminar sua parte.

## Capacidades de IA no produto (princípios, independente de feature)

Todo projeto nasce com a pergunta "onde IA agregaria valor aqui?" sendo
feita de forma estruturada — via o subagent `ai-consultor` — em vez de
deixada ao acaso ou esquecida até tarde demais.

### Papéis envolvidos
- `ai-consultor`: sugere oportunidades a partir de spec.md, nunca decide
  nem implementa.
- `arquiteto`: desenha onde a oportunidade aprovada entra na arquitetura
  hexagonal (interface `LLMClient` em `/port`, adapter específico do
  provedor).
- `dev-ia`: implementa apenas o que já foi aprovado e desenhado.

### Regras inegociáveis
- **Nenhuma capacidade de IA é implementada sem aprovação explícita**
  registrada em `oportunidades-ia.md` — o `ai-consultor` sugere, o dono do
  produto aprova, o `dev-ia` implementa. Nunca pular a aprovação.
- **Dado sensível nunca vai para um provedor de LLM sem decisão
  explícita.** Se a funcionalidade envolve dado pessoal, dado de processo,
  ou qualquer informação sensível por natureza do negócio, isso precisa
  estar registrado e decidido (anonimizar antes de enviar, usar provedor
  com acordo de confidencialidade adequado, ou não enviar) antes do
  `dev-ia` implementar — não depois.
- **Toda chamada a LLM passa por uma interface `LLMClient` em `/port`**,
  nunca chamada direto do SDK do provedor dentro do `/usecase` — mesma
  lógica de Dependency Inversion já aplicada a banco e cache.
- **Saída de IA é sempre estruturada e validada contra schema**, nunca
  texto livre parseado por regex/heurística.
- **Human-in-the-loop por padrão para qualquer efeito de alto custo de
  erro** (ex: aprovar algo automaticamente, modificar/excluir dado) — a
  saída da IA vira sugestão para revisão humana, não ação automática,
  salvo decisão explícita em contrário registrada em design.md com
  justificativa.
- **Prompts são versionados em arquivo** (`/prompts/`), nunca string solta
  embutida no meio do código — mudança de prompt deve aparecer como diff
  legível em revisão de código.
- **Observabilidade de IA é parte da observabilidade geral do projeto:**
  latência, contagem de chamadas e tokens de entrada/saída são métricas
  Prometheus, com label identificando a oportunidade de IA — nunca logar
  o conteúdo completo de prompt/resposta se envolver dado sensível.

## Value Objects (DDD Tático — componente obrigatório do domínio)

Value Objects são objetos imutáveis definidos por seus atributos, não por identidade — dois Value Objects com os mesmos atributos são intercambiáveis. Eles vivem em `/domain` junto com as entidades e representam conceitos de negócio que têm **regras e restrições próprias**, mas não precisam de identidade única.

### Por que são especialmente importantes na nossa arquitetura

Três razões diretas para o nosso contexto:

1. **Validação centralizada no domínio:** a regra de "um CPF deve ter 11 dígitos no formato correto" é do domínio, não do handler HTTP nem do adapter de banco. O Value Object `CPF` carrega essa validação consigo — qualquer container que receba um `CPF` já recebeu um CPF validado, sem repetir a validação em camadas diferentes.

2. **Imutabilidade em sistemas multi-container:** Value Objects podem ser compartilhados entre threads, cacheados sem cópia defensiva, e são mais fáceis de raciocinar em sistemas distribuídos. Num ambiente com 10 réplicas de backend, um `Dinheiro{valor: 100, moeda: "BRL"}` é o mesmo objeto em qualquer réplica — sem risco de mutação parcial.

3. **Prevenção de "Primitive Obsession":** em vez de passar `string` para endereço, `float64` para dinheiro, ou `string` para e-mail por todo o código, o tipo já documenta e valida o conceito. O compilador ajuda a pegar erros em tempo de compilação em vez de tempo de execução.

### O que deve ser um Value Object (identificar durante o design)

O `arquiteto`, ao analisar as entidades de `/domain`, identifica atributos que são candidatos a Value Object. Regra prática: **se um campo tem regras de formatação, validação, ou operações próprias, ele é candidato.**

Exemplos comuns:

| Candidato | Por quê não é só um primitivo |
|---|---|
| `Email` | Tem validação de formato, pode extrair domínio |
| `CPF` / `CNPJ` | Tem dígito verificador, tem formatação |
| `Telefone` | Tem DDD, pode normalizar para E.164 |
| `Dinheiro` | Tem moeda, tem regras de arredondamento, operações entre moedas |
| `CEP` / `Endereco` | Tem campos próprios, pode ser enriquecido via API de CEP |
| `Periodo` | Início + fim com regra "início deve ser antes do fim" |
| `Percentual` | Deve estar entre 0 e 100, tem semântica específica |
| `Status` | Enum tipado com transições válidas definidas no domínio |

### Regras de implementação (independente de linguagem)

- **Imutáveis:** criados via construtor/factory que valida na criação — sem setters, sem mutação após criação.
- **Igualdade por valor:** dois `Email("a@b.com")` são iguais; dois `Entidade{id: x}` só são iguais se o ID for o mesmo.
- **Validação no construtor:** se os dados são inválidos, o construtor/factory retorna erro — nunca cria um Value Object inválido. Isso garante que **qualquer instância existente já é válida**, sem precisar checar depois.
- **Sem identidade:** nunca tem campo `id` próprio — são parte de uma entidade, não persistidos independentemente.
- **Serialização segura:** devem serializar/deserializar corretamente para trafegar em filas de mensagens (relevante para a arquitetura de mensageria).

### Onde vivem na arquitetura hexagonal

```
/domain
  /entity
    processo.go        # Entidade — tem id, muda de estado
  /valueobject         # ou /vo — pasta própria dentro de /domain
    email.go
    cpf.go
    dinheiro.go
    periodo.go
    status_processo.go
```

O `/port` e o `/adapter` nunca recebem primitivos quando existe um Value Object correspondente — o handler Gin parseia a string bruta do request e imediatamente converte para o Value Object, propagando o erro 400 se inválido.

## Design para múltiplos containers (stateless por padrão)

Todo serviço é projetado para escalar horizontalmente desde o primeiro dia
— 1, 2, 10, 100 réplicas atrás de um balanceador de carga (Kubernetes,
Nginx, etc.) sem comportamento diferente entre elas. Isso não é otimização
futura; é restrição de design que se aplica a toda funcionalidade desde o
início.

### Regras derivadas desta restrição (inegociáveis)

**Estado de sessão:** nunca armazenado em memória do processo (arquivo,
variável global, cache local). Todo estado de sessão vai para Redis — o
mesmo Redis que já é componente padrão do projeto. A interface `Session`
em `/port` garante que o use case não sabe se está falando com Redis local
ou Redis cluster; o adapter cuida disso.

**Upload e processamento de arquivo:** se o frontend envia um arquivo para
o container A mas o processamento acontece no container B (que não tem esse
arquivo em disco), o sistema quebra. Arquivos vão para armazenamento externo
(ex: S3, MinIO, volume compartilhado) — nunca em disco local do container.

**Locks e operações que exigem exclusividade:** usar Redis (SETNX, Redlock)
em vez de lock de processo. Ex: job que não pode rodar em paralelo em dois
containers ao mesmo tempo.

**Cache local é aceitável apenas para dado verdadeiramente imutável e
idêntico em todos os containers** (ex: lista de países, configuração
estática). Qualquer dado que pode variar por usuário ou por ação recente
vai para Redis ou banco.

## Avaliação de mensageria por funcionalidade

O `arquiteto`, ao gerar `design.md`, sempre avalia explicitamente se a
funcionalidade se beneficiaria de mensageria — não assume que REST
síncrono é sempre a resposta certa.

### Critérios para recomendar mensageria (RabbitMQ / Kafka)

Use mensageria quando uma ou mais condições forem verdadeiras:
- **Processamento demorado:** a operação leva mais de ~2s e o usuário não
  precisa do resultado imediato (ex: gerar relatório, enviar e-mail em
  lote, processar arquivo pesado).
- **Fan-out:** um evento precisa disparar múltiplas ações independentes
  (ex: "pedido criado" → notificar cliente + atualizar estoque + gerar
  NF).
- **Resiliência a pico:** o receptor pode processar no ritmo dele sem
  sobrecarregar o banco em bursts de requisição.
- **Desacoplamento de serviço:** o serviço emissor não deve conhecer nem
  depender do serviço receptor.

**Não use mensageria** quando o resultado é necessário imediatamente na
resposta HTTP (ex: busca, criação de objeto que precisa de ID para
redirecionar).

### Outbox Pattern (obrigatório junto com mensageria)
Quando mensageria for adotada, o Outbox Pattern é pré-requisito — garante
que "gravou no banco" e "publicou o evento" são atômicos. Sem isso, uma
falha entre os dois cria inconsistência silenciosa.

## UI assíncrona por padrão (toda ação do usuário)

Toda interação que envolve comunicação com o backend segue este padrão
sem exceção — não é opcional por funcionalidade, é o comportamento padrão
de todos os componentes interativos.

### Regras de feedback visual (implementadas pelo `dev-frontend`)

**Padrão visual obrigatório para botões durante operação:**

Todo botão que dispara uma operação assíncrona (submit, pesquisar, salvar,
excluir, criar, exportar, qualquer ação que faz chamada à API) deve seguir
este comportamento visual no momento do clique — sem exceção:

1. **Desabilitar imediatamente** — bloqueia duplo clique
2. **Substituir o ícone por spinner animado** — mesmo tamanho do ícone original
3. **Alterar o texto** — indica o que está acontecendo, não o que aconteceu
4. **Opacidade reduzida** — reforça visualmente que está processando

```
Estado normal:    [  ✚  Criar Processo  ]
Estado loading:   [  ⟳  Criando...      ]   ← spinner + texto no gerúndio + disabled
Estado erro:      [  ✚  Criar Processo  ]   ← volta ao normal, toast de erro
Estado sucesso:   [  ✚  Criar Processo  ]   ← volta ao normal, toast de sucesso
```

**Textos no gerúndio durante loading:**
- "Salvar" → "Salvando..."
- "Criar" → "Criando..."
- "Excluir" → "Excluindo..."
- "Pesquisar" → "Pesquisando..."
- "Enviar" → "Enviando..."
- "Carregar" → "Carregando..."

**Tipos de botão e seu comportamento:**

| Tipo | Exemplo | Comportamento de loading |
|---|---|---|
| Submit de formulário | "Salvar", "Criar" | spinner + texto gerúndio + form.disable() |
| Ação destrutiva | "Excluir" | spinner + "Excluindo..." + disabled |
| Pesquisa | "Pesquisar" | spinner + "Pesquisando..." + disabled até resultado |
| Ação secundária | "Exportar", "Imprimir" | spinner + texto gerúndio + disabled |
| Link de navegação | item do menu | spinner no item + barra no topo (ver seção navegação) |

**Estado de loading exposto pelo hook, nunca gerenciado no componente:**
```ts
// Hook expõe o estado — componente só reflete
const { isSubmitting, isLoading, error } = useProcesso()

// Componente usa LoadingButton (shared/ui) — não implementa loading manualmente
<LoadingButton
  loading={isSubmitting}
  loadingText="Salvando..."
  onClick={salvar}
>
  Salvar
</LoadingButton>
```

**O componente `LoadingButton` é obrigatório em `shared/ui/`.**
Nunca implementar o padrão de loading botão ad-hoc dentro de uma feature —
extrair para shared/ na primeira ocorrência. A implementação concreta
vem da skill de frontend da stack configurada.

**Grid com botões de ação por linha (editar, excluir, etc.):**

Botões de ação em linhas do grid precisam de **loading por ID de item** —
não um boolean global. Quando o usuário clica em "Excluir" na linha 3,
só aquele botão mostra loading. As outras linhas permanecem normais.

```
Linha 1: [✎ Editar] [✗ Excluir]
Linha 2: [✎ Editar] [⟳ Excluindo...]  ← só este, rastreado pelo ID
Linha 3: [✎ Editar] [✗ Excluir]
```

O hook rastreia qual ID está sendo processado:
```ts
const [deletingId, setDeletingId] = useState<string | null>(null)
const [editingId,  setEditingId]  = useState<string | null>(null)

// O componente de linha verifica o ID
<LoadingButton
  loading={deletingId === row.id}
  loadingText="Excluindo..."
  onClick={() => excluir(row.id)}
/>
<LoadingButton
  loading={editingId === row.id}
  loadingText="Abrindo..."
  onClick={() => abrirEdicao(row.id)}
/>
```

**Botão "Editar" também dispara loading:** mesmo que a edição abra um
modal local (sem chamada à API), o clique deve mostrar feedback imediato
enquanto o modal carrega os dados. Se navegar para outra rota, a barra
superior já dispara via interceptor — mas o botão da linha também deve
mostrar seu estado de loading até a navegação completar.

**A barra superior dispara automaticamente** via interceptor HTTP quando
o clique dispara uma chamada à API (excluir, carregar dados do item para
edição). Para ações de navegação pura (ir para `/processos/123/editar`),
a barra dispara via `startNavigation()` ou `NavLink`.

**Formulário de criação/edição:**
- `form.disable()` em todos os campos durante o envio — não só o botão
- Após sucesso: toast + limpar formulário (criação) ou toast + manter dados (edição)

**Estados distintos obrigatórios em todo componente de listagem:**
- `isLoading` → skeleton com N linhas (não spinner centralizado)
- `isEmpty` → mensagem "Nenhum resultado encontrado" com ícone
- `hasError` → mensagem de erro + botão "Tentar novamente"
- `hasData` → grid com resultados

## Testes obrigatórios por funcionalidade (cobertura mínima)

Toda funcionalidade entregue **precisa de testes** para ser considerada
concluída — sem exceção. O `analista-requisitos` propõe os casos de teste
como parte da spec; o `construtor-testes-e2e` os implementa; o `qa-tester`
valida de forma independente.

### O que deve ser testado por camada

**Use case (unitário, obrigatório):**
- Cada cenário Given/When/Then de spec.md tem um teste de use case
  correspondente.
- Casos de borda identificados pelo analista (campo vazio, valor inválido,
  usuário sem permissão) têm teste próprio.
- Comportamento com mensageria (se aplicável): teste verifica que o evento
  foi publicado, não só que o banco foi atualizado.

**Handler HTTP (integração, obrigatório):**
- Contrato de API (rota, request, response, código de status) verificado
  contra o especificado em design.md.
- Códigos de erro explícitos (400, 401, 403, 404, 409) verificados com
  payload de erro no formato padrão.

**E2E com Playwright (obrigatório para funcionalidades com tela):**
- Fluxo principal completo com dados reais de spec.md.
- Fluxos de erro visíveis (ex: formulário com campo obrigatório vazio,
  mensagem de erro aparece).
- **Comportamento assíncrono verificado:** botão fica desabilitado durante
  carregamento, grid mostra estado de espera, resultado aparece após
  carregamento — não apenas "a página não quebrou".

**Estados de UI (verificados no E2E ou teste de componente):**
- Estado vazio (sem resultados) mostra mensagem adequada.
- Estado de erro mostra feedback ao usuário.
- Estado de carregamento é visível e diferente do estado vazio.

## Autenticação e autorização (fluxo separado, deliberado)

### Princípio: funcionar primeiro, proteger depois

Toda funcionalidade é construída **primeiro** com `DEV_SEM_AUTH=true` e
validada pelo dono do produto. A autenticação é adicionada em uma conversa
separada com o `arquiteto`, que define quais rotas exigem login e qual
perfil/permissão é necessário.

### Modelo de autorização: ABAC (Attribute-Based Access Control)

ABAC é o modelo adotado neste projeto. É mais flexível que RBAC puro porque
combina atributos de quatro dimensões para cada decisão de acesso:

- **Sujeito:** `role` (Gerente, Analista), `department`, `employee_id`
- **Recurso:** tipo de dado, owner, classification
- **Ação:** criar, ler, alterar, excluir, aprovar
- **Ambiente:** horário, localidade (IP/região), dia da semana

**Regra prática:** comece com perfil + permissão (o núcleo RBAC), e adicione
restrições de atributo de ambiente quando o negócio exigir. Exemplo:

```
Permitir: sujeito.role == "Gerente"
      AND ação == "excluir_conta"
      AND ambiente.horário BETWEEN 08:00 AND 18:00
      AND ambiente.localidade IN ["SP", "RJ"]
```

### Componentes do ABAC na arquitetura hexagonal

```
/domain
  /valueobject
    Permission.go      # ex: "adicionar_conta"
    Role.go            # ex: "Gerente", "Analista"
  /entity
    Policy.go          # política ABAC: sujeito + recurso + ação + condições
/port
  AuthorizationChecker # interface: CanAccess(ctx, subject, resource, action) bool
/adapter
  /abac
    PolicyEngine.go    # implementação real — lê políticas do banco/Redis
/usecase
  # use cases nunca checam autorização diretamente — recebem o contexto
  # de autorização via interface do port
```

**Regra inegociável:** a lógica de política ABAC fica no adapter/engine,
nunca espalhada em `if`s por todo o código. Separação entre código e política
é a característica central do ABAC.

### Tabelas de banco para ABAC

```sql
-- perfis de usuário
CREATE TABLE perfil (id UUID PRIMARY KEY, nome TEXT NOT NULL UNIQUE, ...);

-- permissões disponíveis no sistema
CREATE TABLE permissao (id UUID PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, descricao TEXT);

-- associação perfil-permissão com restrições de atributo
CREATE TABLE politica_abac (
  id UUID PRIMARY KEY,
  perfil_id UUID NOT NULL REFERENCES perfil(id),
  permissao_id UUID NOT NULL REFERENCES permissao(id),
  restricoes JSONB,  -- {"horario": {"inicio": "08:00", "fim": "18:00"}, "localidade": ["SP"]}
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### JWT + ABAC

Atributos do sujeito viajam nos claims do JWT (curta duração, renovados
frequentemente para evitar atributos obsoletos). O contexto de ambiente
(horário, IP) é avaliado no momento da requisição. O backend nunca confia
em atributo de ambiente enviado pelo cliente — usa o da própria requisição.

## Sistema de auditoria (duplo canal — local + syslog)

Toda ação relevante do sistema é registrada em dois canais simultâneos:

### Canal 1 — Auditoria local (banco de dados)
```sql
CREATE TABLE auditoria (
  id UUID PRIMARY KEY,
  usuario_id UUID,           -- null = ação não autenticada
  acao TEXT NOT NULL,        -- ex: "criar_processo", "excluir_conta"
  recurso_tipo TEXT,         -- ex: "Processo", "Conta"
  recurso_id UUID,           -- id do objeto afetado
  resultado TEXT NOT NULL,   -- "sucesso" | "negado" | "erro"
  detalhes JSONB,            -- dados extras não-sensíveis
  ip_origem INET,
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Canal 2 — Syslog remoto
Eventos críticos (login, falha de autenticação, acesso negado por ABAC,
deleção de dado) são enviados para servidor syslog configurável por variável
de ambiente:
```
SYSLOG_SERVER=syslog.empresa.com:514
SYSLOG_PROTOCOL=tcp   # ou udp
SYSLOG_APP_NAME=nome-do-sistema
```

**Interface no port:**
```go
// /port/AuditLogger
type AuditLogger interface {
    Log(ctx context.Context, entry AuditEntry) error
}
// Implementação no adapter combina os dois canais
```

**O que sempre auditar:** tentativa de login (sucesso e falha), acesso negado
por ABAC, criação/alteração/exclusão de entidades de negócio, alteração de
política de autorização.

**O que nunca logar:** senha em texto plano, token completo, dados pessoais
sensíveis (CPF, número de conta) — apenas o ID do recurso afetado.

## Observabilidade: métricas específicas de ABAC e Auditoria

> Regras gerais de observabilidade (endpoints /metrics, /healthz, /readyz,
> middleware global, configuração por variável de ambiente) estão na seção
> "Observabilidade" no início deste arquivo. Esta seção apenas complementa
> com as métricas específicas do domínio de segurança.

### Métricas obrigatórias além das técnicas padrão

- Contador de decisões ABAC por resultado (permitido/negado) e por permissão
- Latência do engine de políticas ABAC
- Contador de eventos de auditoria por canal (local/syslog)
- Contador de falhas de autenticação

## .gitignore obrigatório por serviço

Cada serviço do projeto (backend, frontend) e a raiz do repositório devem
ter seu próprio `.gitignore`. O `dev-docker-compose` é responsável por criar e manter
esses arquivos.

Raiz do projeto:
```gitignore
.env
.env.*
!.env.example
*.log
```

Backend (Go):
```gitignore
/tmp/
*.exe
*.test
*.prof
```

Backend (Python):
```gitignore
__pycache__/
*.pyc
.venv/
dist/
```

Backend (Java):
```gitignore
target/
*.class
.mvn/wrapper/maven-wrapper.jar
```

Frontend (Next.js):
```gitignore
node_modules/
.next/
out/
```

Frontend (Angular):
```gitignore
node_modules/
dist/
.angular/
```

## Diagramas Mermaid — localização obrigatória

Todo diagrama gerado por qualquer agente é um bloco ` ```mermaid ``` `
dentro de um arquivo `.md` e **fica em `specs/<feature>/`** — nunca em
`/tmp`, nunca na raiz do projeto.

| Diagrama | Gerado por | Localização |
|---|---|---|
| Fluxo da feature (sequenceDiagram, stateDiagram-v2, flowchart) | `arquiteto` | `specs/<feature>/design.md` (seção "Diagrama Mermaid") |
| Schema da feature (erDiagram) | `dba` | `specs/<feature>/diagrama-banco.md` |
| MER consolidado de todo o projeto | `tech-writer` | `specs/diagrama-banco.md` (raiz de specs/) |

**Regra geral:** todo diagrama fica em `specs/`.
- Feature específica → `specs/<feature>/`
- Escopo do projeto inteiro (MER completo) → `specs/` (raiz)
- `docs/` é reservado apenas para `openapi.yaml` (gerado pelo framework)
- Nunca gerar diagrama em `/tmp`

## Referências de segurança e qualidade

### Comentários que chegam ao usuário final — proibidos

Esta é uma regra de segurança, distinta da regra de comentários gerais
(princípio 4). Comentários em código exposto ao usuário vazam informações
sobre arquitetura, rotas internas, lógica de negócio e podem facilitar
ataques.

**O que chega ao usuário e nunca deve ter comentário:**

| Contexto | Como chega ao usuário | Risco |
|---|---|---|
| Código frontend (JS/TS) | Bundle enviado ao browser — visível no DevTools | Lógica de negócio, rotas de API, chaves hardcoded |
| Templates HTML | Source da página (`Ctrl+U`) | Estrutura interna, endpoints, comentários de debug |
| Respostas de API | Campos de erro, stack traces no body | Tecnologia, estrutura do banco, caminhos internos |
| OpenAPI/Swagger público | Spec acessível sem autenticação | Nomes de tabelas, regras de negócio, lógica interna |
| CSS/SCSS compilado | Arquivo enviado ao browser | Nomes de componentes, estrutura de módulos |

```typescript
// ❌ PROIBIDO no frontend — exposto no bundle
// TODO: remover validação de admin após demo para o cliente Acme
// Endpoint interno: /api/v1/admin/usuarios — não documentar
// Chave de homologação: sk-hml-xxxxx

// ❌ PROIBIDO em template HTML — exposto no source
<!-- Componente de autenticação JWT — verificar token em /auth/verify -->
<!-- Desabilitado temporariamente: verificação de 2FA -->

// ❌ PROIBIDO em resposta de API — exposto no body de erro
{ "error": "SELECT * FROM usuario WHERE id = ... falhou", "stack": "..." }

// ✅ Comentário de desenvolvimento — fica APENAS no backend server-side
// Esta query usa índice parcial — remover WHERE excluido_em IS NULL quebra performance
const result = await db.query(...)
```

**Regras práticas:**
- Frontend (Next.js, Angular): **zero comentários** no código que vai para o bundle.
  Documentação de componente vai no spec.md, não no arquivo `.tsx`/`.ts`
- Respostas de erro da API: nunca incluir stack trace, nome de tabela,
  query SQL ou caminho de arquivo — apenas código de erro e mensagem genérica
- OpenAPI: descrições devem ser orientadas ao consumidor da API, não revelar
  implementação interna (ex: "Busca por índice GIN no campo tags" → remover)
- HTML: nenhum comentário em templates — usar documentação no spec.md

**O `security-reviewer` e o `code-reviewer` verificam isso ativamente.**
Comentário proibido encontrado = achado **Crítico** (não Baixo nem Médio).

### OWASP Top 10:2025 (referência de segurança para toda revisão)

Versão atual do padrão de segurança para aplicações web, lançada em
janeiro de 2026. Toda aplicação deste projeto é web — portanto, toda
entrega é avaliada contra esta lista. O `security-reviewer` usa a lista
completa como checklist estruturado. As categorias 2025 são:

1. **A01 — Broken Access Control** (inclui SSRF, IDOR, BOLA)
2. **A02 — Security Misconfiguration** (subiu de #5 para #2)
3. **A03 — Software Supply Chain Failures** *(novo em 2025)*
4. **A04 — Cryptographic Failures**
5. **A05 — Injection** (SQL, XSS, command)
6. **A06 — Insecure Design**
7. **A07 — Identification & Authentication Failures**
8. **A08 — Software & Data Integrity Failures** (inclui CI/CD)
9. **A09 — Security Logging & Alerting Failures**
10. **A10 — Mishandling of Exceptional Conditions** *(novo em 2025)*

Referência oficial: https://owasp.org/Top10/2025/

### SonarQube — análise estática obrigatória no pipeline de CI

Todo projeto tem `sonar-project.properties` na raiz e passa pelo
SonarQube como **fase obrigatória do pipeline** (não opcional, não manual).
Quality Gate mínimo: cobertura ≥ 80%, nenhum bug/vulnerabilidade nova de
severidade Critical ou Blocker. O `dev-docker-compose` configura e mantém este pipeline.

## Hierarquia de autoridade e resolução de conflito

Todo sistema multiagente precisa de uma cadeia de autoridade clara.
Quando dois agentes discordam, ou quando um agente questiona a decisão de
outro, esta hierarquia define quem tem a palavra final — sem loop, sem
negociação infinita.

### Cadeia de autoridade

```
Dono do produto        ← autoridade máxima — aprovação final sempre humana
        │
analista-requisitos    ← o que o sistema faz (spec.md é a lei)
        │
arquiteto              ← como é construído (design.md é a lei)
        │
dba                    ← como o banco suporta (schema final)
        │
dev-fullstack          ← como é implementado (segue design.md + skills)
        │
qa-tester              ← se funciona conforme spec.md (reporta, não decide)
```

### Regras de autoridade por domínio

**Requisitos e comportamento do sistema (`analista-requisitos`)**
- `spec.md` define o que o sistema deve fazer — nenhum outro agente
  altera o escopo sem passar pelo analista.
- Se o `dev-fullstack` ou o `arquiteto` descobrir durante a implementação
  que um requisito é ambíguo, contraditório ou tecnicamente inviável:
  para, documenta o problema em `specs/<feature>/spec.md` como "questão
  aberta" e devolve ao analista. Não resolve por conta própria.

**Decisões técnicas e arquiteturais (`arquiteto`)**
- `design.md` define como construir — o `dev-fullstack` implementa
  o que design.md diz, nunca o que acha melhor.
- Se o `security-reviewer` ou `code-reviewer` apontar um problema
  que exige mudança arquitetural (ex: "esta abordagem cria IDOR"),
  o `arquiteto` é quem decide a solução — não os revisores.
  Os revisores identificam e descrevem o problema; o arquiteto resolve.
- Se o `dev-fullstack` discordar de uma decisão de design.md:
  registra a discordância em `tasks.md` com justificativa técnica
  e devolve ao arquiteto. Não implementa diferente do que design.md diz.

**Schema de banco (`dba`)**
- O `dba` tem a palavra final sobre como o schema é estruturado
  (tipos, índices, constraints, estratégia de migration).
- O `arquiteto` define o que o schema precisa suportar (entidades,
  relações, volume esperado) — o dba decide como implementar isso.
- Se o `dev-fullstack` discordar de uma decisão do dba sobre um
  índice ou tipo: devolve ao dba com justificativa. Não altera o
  script sem aprovação.

**Segurança (`security-reviewer`)**
- O `security-reviewer` pode **bloquear** a entrega de uma feature
  registrando achado Crítico ou Alto não resolvido em `evidence.md`.
- Mas não decide a solução — descreve o problema e o vetor de ataque.
  O `arquiteto` decide como corrigir.
- O dono do produto pode aceitar um risco explicitamente documentado
  (aceitar o risco, não ignorar o achado).

**Resultado dos testes (`qa-tester`)**
- O `qa-tester` reporta o resultado real — não aprova nem rejeita
  o merge por conta própria.
- Se testes falham: chama o `dev-fullstack` para corrigir.
- A decisão de "isso está bom o suficiente para ir para produção"
  é sempre do dono do produto, nunca do qa-tester.

### Protocolo quando dois agentes entram em loop

Se dois agentes ficam em loop (ex: `dev-fullstack` e `dba` discordando
sobre um índice, ou `arquiteto` e `security-reviewer` discordando sobre
uma abordagem de ABAC):

1. **O agente de menor autoridade no domínio em questão** registra a
   discordância por escrito em `tasks.md` ou `evidence.md` com:
   - Qual é o ponto de discordância
   - Posição de cada agente com justificativa técnica
   - Por que não conseguiram chegar a acordo

2. **O agente de maior autoridade no domínio** toma a decisão final
   e a registra em `design.md` ou `spec.md` como decisão documentada.

3. Se a discordância envolve dois domínios (ex: requisito vs. decisão
   técnica): **o dono do produto é chamado** para decidir.

4. **Nunca:** ficar pedindo a mesma coisa em loop, implementar
   "na metade do caminho" para agradar os dois, ou ignorar silenciosamente
   a discordância.

## Protocolo obrigatório de início de sessão

**Esta regra se aplica a qualquer subagent ou à thread principal ao iniciar
uma nova sessão ou ao receber a primeira mensagem do usuário no projeto.**

Antes de qualquer outra ação, execute esta verificação na ordem exata:

### Passo 1 — Existe documento de visão?
Verifique se `specs/00-visao-produto.md` existe.

**Se NÃO existe:**
→ Não presuma nada. Pergunte ao usuário os dados necessários para criá-lo:

```
Para iniciarmos o projeto, preciso de algumas informações:

1. Qual é o objetivo do sistema? O que ele resolve e para quem?
2. Quais serão os usuários/atores principais?
3. Quais funcionalidades você já tem em mente (pode ser uma lista inicial)?
4. Tecnologias preferidas:
   - Backend (linguagem + framework): ex: Go + Gin, Node.js + Express, Python + FastAPI
   - Frontend (framework + componentes): ex: Next.js + shadcn/ui, React + Material UI
   - Banco de dados: ex: PostgreSQL, MySQL
   - Provedor de IA (se houver): ex: Anthropic Claude, OpenAI
5. Tem alguma restrição importante? (ex: LGPD, acessibilidade, volume de usuários esperado)
```

Após receber as respostas, o `analista-requisitos`:
- Cria `specs/00-visao-produto.md` com o template de visão
- **Preenche `project.config.md`** com as tecnologias informadas — isso é
  fundamental, pois todos os outros agentes dependem desse arquivo para
  saber qual stack usar
- Para e mostra os dois arquivos ao usuário para validação antes de qualquer
  próximo passo

**Se existe:**
→ Leia `specs/00-visao-produto.md` e `specs/_status.md` para entender onde
o projeto está. Informe ao usuário o estado atual:
```
Projeto: <nome>
Funcionalidades identificadas: <lista com fase atual de cada uma>
Próximo passo sugerido: <o que falta fazer>
```
Aguarde instrução do usuário.

### Passo 2 — Qual é o próximo passo?
Com o documento de visão existente, o fluxo normal é:

```
Usuário descreve funcionalidade
        ↓
analista-requisitos → cria spec.md → PARA e aguarda validação
        ↓ (usuário valida)
ux-designer (se tiver tela) → cria ux.md → PARA e aguarda validação
        ↓ (usuário valida)
ai-consultor (opcional) → cria oportunidades-ia.md → PARA e aguarda aprovação
        ↓ (usuário aprova/rejeita oportunidades)
arquiteto → cria design.md + tasks.md → PARA e aguarda validação
        ↓ (usuário valida — este é o ponto de disparo do time de desenvolvimento)
arquiteto coordena os subagents de implementação conforme tasks.md
        ↓
[ciclo de implementação, revisão, testes]
        ↓
qa-tester → evidence.md → PARA e aguarda aprovação final do usuário
```

**Cada PARA neste fluxo é obrigatório.** Nenhum agente avança para a próxima
fase sem confirmação explícita do usuário — mesmo que o próximo passo pareça
óbvio. Confirmação explícita é qualquer variação de "aprovado", "pode
seguir", "ok", "tá bom" — não silêncio, não uma pergunta sobre outro assunto.

## Gates de aprovação humana obrigatórios (regra dura, não sugestão)

Nenhum subagent encadeia automaticamente para a próxima fase sem
aprovação explícita do dono do produto. Isso vale mesmo que pareça óbvio
seguir adiante — "parece óbvio" não é aprovação.

- **Depois do `analista-requisitos`** (visão ou spec.md): ele reporta o
  que fez e PARA. Só prossegue para `ux-designer`/`ai-consultor`/
  `arquiteto` quando o usuário disser algo equivalente a "aprovado, pode
  seguir" — nunca por iniciativa própria, mesmo que o próximo passo
  pareça evidente.
- **Depois do `arquiteto`** (design.md + tasks.md): mesma regra — PARA e
  espera aprovação antes de qualquer subagent de implementação ser
  chamado. O `arquiteto` é, na prática, quem coordena o time de
  desenvolvimento depois desse ponto — não existe um papel separado de
  "chefe de desenvolvimento"; é o `arquiteto` aprovado que assume esse
  papel a partir daqui.
- **Antes do merge** (evidence.md pronto): `qa-tester` reporta o
  resultado e PARA — a decisão final de mergear é sempre humana.

Se o usuário pedir explicitamente "pode seguir direto sem parar entre
fases" para uma sessão específica, os subagents podem encadear — mas o
padrão é sempre parar, nunca encadear por suposição.

## Paginação e ordenação em listagens (regra obrigatória, não opcional)

Todo grid/listagem do padrão CRUD (seção acima) suporta paginação e
ordenação desde a primeira versão — nunca "adicionar depois quando a
tabela crescer". Isso atravessa as três camadas:

### Contrato de API (padrão para toda consulta de listagem)
```
GET /api/v1/<recurso>?page=1&page_size=20&sort=<campo>&order=asc
```
Resposta sempre com envelope de metadados, nunca array solto:
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "page_size": 20, "total": 142, "total_pages": 8 }
}
```
- `page_size` tem um máximo definido (ex: 100) — nunca aceitar
  `page_size` arbitrariamente grande vindo do cliente, isso é vetor de
  negação de serviço barato.
- Default de `page_size` quando omitido: 20.

### Segurança da ordenação (regra inegociável)
O campo de `sort` **nunca** é interpolado direto numa cláusula `ORDER BY`
— isso é vetor de SQL injection. Toda entidade define um **allowlist**
de campos ordenáveis (ex: `criado_em`, `descricao`, `status`) no adapter
de persistência; um valor de `sort` fora da allowlist é erro 400, não
silenciosamente ignorado nem aceito.

### Onde cada papel entra
- `ux-designer`: ao definir colunas do grid (já obrigatório no padrão
  CRUD), também define quais colunas são ordenáveis, **qual coluna é a
  ordenação padrão e em qual direção** (ex: `criado_em` decrescente — "o
  mais recente primeiro"), e o tamanho de página padrão da tela —
  perguntando ao dono do produto, nunca assumindo. Toda listagem PRECISA
  de uma ordenação padrão definida; "sem ordenação" não é uma opção válida
  — o banco sempre retorna em alguma ordem, então é melhor que seja uma
  ordem intencional.
- `arquiteto`: o método de consulta em `/usecase/query` recebe parâmetros
  de paginação/ordenação como parte da assinatura desde o desenho —
  nunca adicionado depois como afterthought.
- `dev-backend`: implementa a allowlist de ordenação e o `LIMIT`/`OFFSET`
  (ou paginação por cursor, se o gatilho de volume justificar — ver
  Roadmap de Maturidade) na query real. Aplica a ordenação padrão definida
  em design.md quando a requisição não especificar `sort`/`order`.
- `dba`: garante índice nas colunas mais usadas para ordenação/filtro —
  ordenar por coluna sem índice em tabela grande é o tipo de problema que
  só aparece em produção se ninguém pensar nisso agora.
- `dev-frontend`: implementa três comportamentos específicos, sempre
  juntos:
  1. **Clique no cabeçalho da coluna:** primeiro clique ordena
     crescente; clicar de novo na mesma coluna alterna para decrescente
     (toggle entre os dois — nunca um terceiro estado "sem ordenação",
     já que sempre existe uma ordenação ativa). Clicar numa coluna
     diferente troca a coluna ativa e volta para crescente.
  2. **Ordenação padrão aplicada sempre que a pesquisa é acionada** sem
     que o usuário tenha escolhido outra — a coluna/direção vêm de
     `design.md`/`ux.md`, nunca inventadas no código.
  3. **Persistência entre visitas:** filtro, ordenação e paginação
     (página atual, tamanho de página) são salvos em `localStorage` por
     funcionalidade (chave única, ex: `grid-state:processos`) e
     restaurados automaticamente quando o usuário volta à tela — sem
     precisar reconfigurar filtro/ordenação a cada visita. Ver
     implementação na skill de frontend.

### Gatilho para evoluir de paginação por página para paginação por cursor
Registrado no Roadmap de Maturidade (ver tabela) — paginação por
`page`/`offset` fica lenta em tabelas muito grandes porque o banco
precisa "pular" todas as linhas anteriores a cada página. Migrar para
cursor (`?after=<id>`) só quando isso for medido como problema real, não
por padrão.

## Autenticação em desenvolvimento e CORS

- **Variável de bypass de autenticação para desenvolvimento:**
  `DEV_SEM_AUTH` (booleana). Quando `true`, o backend permite uso de
  qualquer rota sem exigir autenticação — exclusivamente para
  desenvolvimento local.
  - **Regra inegociável:** essa variável só pode existir no
    `docker-compose.yml` (ambiente local) — nunca em manifesto Kubernetes
    de produção/staging, nunca com default `true` no código (default
    deve ser `false`/ausente). O `security-reviewer` verifica isso
    explicitamente a cada revisão.
- **CORS configurável por variável de ambiente:** `CORS_ALLOWED_ORIGINS`
  (lista separada por vírgula). Em desenvolvimento, pode incluir
  `http://localhost:3000`; em produção, lista explícita de domínios
  reais — nunca `*` em produção.

## Docker Compose: dois ambientes, comportamentos distintos

| Arquivo | Quando usar | Comportamento |
|---|---|---|
| `docker-compose.dev.yml` | Desenvolvimento local | Volume montado com o código da máquina host; hot-reload ativo; sem build de imagem |
| `docker-compose.yml` | Produção / CI | Build completo da imagem; sem volume de código; imagem auto-contida |

**Nunca misturar os dois** — adicionar volume de código no compose de produção anularia o propósito do build multi-stage. Nunca depender de `docker compose up --build` durante desenvolvimento — se o desenvolvedor precisa rebuildar pra ver uma mudança de código, o `docker-compose.dev.yml` está configurado incorretamente.

### Regras do `docker-compose.dev.yml`
- Volume montando o código da máquina host para dentro do container
  (ex: `./backend:/app`) — qualquer mudança de arquivo reflete
  imediatamente dentro do container sem rebuild.
- Hot-reload ativo: Go usa `air` (detecção de mudança + recompilação
  automática dentro do container); Next.js usa `next dev` (padrão, já
  tem HMR nativo) — o processo principal do container é o watcher, não
  o binário compilado estático.
- Variável `DEV_SEM_AUTH=true` e `CORS_ALLOWED_ORIGINS` liberada para
  desenvolvimento — presentes apenas aqui, nunca no `docker-compose.yml`.
- O serviço `migrate` e o serviço de seed também rodam aqui.

### Regras do `docker-compose.yml` (produção)
- Sem volume de código — a imagem é auto-contida (build multi-stage já
  copiou o código).
- Sem `DEV_SEM_AUTH`, sem `CORS_ALLOWED_ORIGINS` permissiva.
- Manifesto Kubernetes usa a mesma imagem produzida pelo Dockerfile
  — o `docker-compose.yml` de produção e o manifesto K8s nunca divergem
  em qual imagem sobem.

### Comandos de desenvolvimento (sempre via dev compose)
```bash
# subir o ambiente de desenvolvimento (sem build)
docker compose -f docker-compose.dev.yml up

# rodar migration em dev
docker compose -f docker-compose.dev.yml run --rm migrate

# rodar seed em dev
docker compose -f docker-compose.dev.yml run --rm backend go run ./cmd/seed

# rodar testes
docker compose -f docker-compose.dev.yml run --rm backend go test ./... -cover
```

## Ferramental sempre dentro do container, nunca assumindo a máquina do desenvolvedor

Comandos de gerenciamento de dependência (`go mod tidy`, `npm install`,
etc.) **rodam dentro do container/via `docker compose run`**, nunca
assumindo que a máquina do desenvolvedor tem o toolchain instalado
localmente. Isso é o que justifica usar Docker desde o início — se um
comando só funciona porque o desenvolvedor tem Go/Node instalado
localmente, o ambiente containerizado está incompleto.
- Exemplo correto: `docker compose run --rm backend go mod tidy`
- Nunca: instruir o usuário a rodar `go mod tidy` na própria máquina como
  solução para erro de build no container.

## Migrations e seed (automáticos, nunca esquecidos)

- **Migrations rodam automaticamente** ao subir o ambiente — via serviço
  dedicado no `docker-compose.yml` que roda antes do backend subir
  (`depends_on` com `condition: service_completed_successfully`), nunca
  dependendo do desenvolvedor lembrar de rodar manualmente.
- **Script de seed obrigatório por entidade nova**, com dados de
  desenvolvimento plausíveis (nunca dado real) — local convencionado:
  `/internal/adapter/postgres/seed/` (ou equivalente da stack
  configurada), executável via `docker compose run --rm backend
  <comando de seed>`. O `dba` é responsável por garantir que toda
  entidade nova tenha seed correspondente — isso não é opcional nem
  "nice to have".

> Regras de documentação de API (OpenAPI gerado pelo código, nunca escrito
> à mão; UI Swagger; breaking change exige decisão do arquiteto) estão na
> seção "Documentação de API" no início deste arquivo.

## Estratégia de testes (pirâmide completa + funcional/não-funcional)

### Pirâmide de testes funcionais (correção de comportamento)
| Nível | O que verifica | Quem escreve | Quem valida |
|---|---|---|---|
| **Unitário** | Use case isolado (`/usecase`), mockando `/port` | `dev-backend` (TDD — teste antes do código) | `qa-tester` confirma que existe e passa |
| **Integração** | Handler + adapter real (ex: banco de teste) | `dev-backend`/`dev-frontend` | `qa-tester` |
| **E2E** | Fluxo completo pela UI, navegador real (Playwright) | `construtor-testes-e2e`, a partir dos exemplos concretos de spec.md | `qa-tester` (independente de quem escreveu) |
| **Aceitação** | "Isso entrega o que o dono do produto pediu?" — mapeamento 1:1 entre cenário Given/When/Then de spec.md e teste que o verifica | N/A (é o resultado, não um teste novo) | `qa-tester` no `evidence.md` + revisão humana final do dono do produto |

O teste de aceitação não é um artefato extra a mais — é a confirmação, em
`evidence.md`, de que todo cenário de `spec.md` tem teste correspondente
(unitário, integração ou E2E) e passou. Se um cenário não tem teste, isso
é tratado como aceitação não atingida (❌), não como detalhe a esquecer.

### Testes não-funcionais (qualidades do sistema, não comportamento)
| Tipo | O que verifica | Quem cuida |
|---|---|---|
| **Segurança** | Vulnerabilidade, injeção, autenticação, segredo exposto | `security-reviewer` |
| **Qualidade de código/arquitetura** | SOLID, hexagonal, convenção de nomenclatura, duplicação | `code-reviewer` |
| **Performance/carga** | Latência sob carga, throughput, ponto de saturação | `load-tester` (k6) — só quando há gatilho real (ver abaixo) |
| **Acessibilidade** | Navegação por teclado, contraste, ARIA | `ux-designer` (define) + `dev-frontend` (implementa, via Radix/shadcn) |

`security-reviewer` e `code-reviewer` são papéis deliberadamente
separados — segurança e qualidade arquitetural exigem atenção a critérios
diferentes, e misturar os dois dilui o foco de cada revisão.

### Quando o teste de carga é necessário (gatilho, não padrão)
O `arquiteto` marca "Teste de carga necessário" em `design.md` quando:
- O endpoint é crítico para o negócio (ex: login, busca principal) **e**
  espera tráfego não-trivial, ou
- `spec.md` registrou requisito não-funcional explícito de performance
  (RPS esperado, latência máxima aceitável), ou
- O dono do produto pediu explicitamente.

CRUD interno de baixo tráfego, ferramenta administrativa de uso esporádico,
etc. — não precisam de teste de carga por padrão.

## Convenções de teste
- Critérios de aceite em `spec.md` devem ser escritos em Given/When/Then e
  mapear 1:1 para os testes do use case correspondente.
- **Toda spec.md inclui exemplos concretos com dados reais** para cada
  cenário — não apenas o Given/When/Then abstrato. Isso é responsabilidade
  do `analista-requisitos` ao coletar requisitos, e é o material-base que
  o `construtor-testes-e2e` usa para escrever testes E2E reais.
- **Construção e validação de teste E2E são papéis separados:** o
  `construtor-testes-e2e` escreve os testes (Playwright); o `qa-tester`
  valida — revisa a qualidade do teste e roda — de forma independente.
  Nunca o mesmo agente faz as duas coisas para o mesmo teste.

## Versionamento de releases

### Conceito: versão de aplicação vs. versão de API

- **Versão de aplicação** (ex: `1.0`, `1.1`) — declarada pelo dono do produto
  quando um conjunto de features está aprovado e pronto para produção.
  Dispara a consolidação das migrations e o snapshot da API.

- **Versão de API** (ex: `/api/v1/`, `/api/v2/`) — criada apenas quando há
  **breaking change** no contrato da API. Adicionar campo novo não é breaking.
  Remover campo, mudar tipo, mudar comportamento de erro = breaking.

### Ciclo de vida de uma versão de aplicação

```
features em desenvolvimento
        ↓
dono do produto declara "finalizamos a versão X.Y"
        ↓
arquiteto pergunta: "Registrar versão X.Y?"
        ↓ (usuário confirma)
dba consolida migrations → specs/releases/vX.Y/up.sql + down.sql
tech-writer congela snapshot da API → specs/releases/vX.Y/openapi.yaml
tech-writer atualiza CHANGELOG.md com a lista de features da versão
specs/_status.md registra a versão como "lançada"
        ↓
próximas features constroem sobre este baseline
```

### Migrations: dev vs. produção

**Em desenvolvimento** (`DEV_SEM_AUTH=true`):
- Migrations incrementais em `migrations/` — uma por feature
- Seed pode dropar e recriar o banco para reset rápido

**A partir da primeira versão declarada**:
- `specs/releases/vX.Y/up.sql` — estado completo do banco nesta versão
- `specs/releases/vX.Y/down.sql` — rollback completo para banco vazio
- Novos ambientes rodam `up.sql` da versão mais recente + migrations
  incrementais das features que vieram depois
- Ambientes já em produção rodam só as migrations incrementais novas
- **Seed vira idempotente**: só insere dados de referência que ainda não
  existem (`INSERT ... WHERE NOT EXISTS`) — nunca apaga dado real

### Estrutura de releases

```
VERSION                         ← número da versão atual (ex: 1.0.0)
specs/
  releases/
    v1.0/
      release.sql               ← arquivo ÚNICO com seções -- UP e -- DOWN
      openapi.yaml              ← snapshot da API nesta versão
      CHANGELOG.md              ← o que mudou nesta versão
    v1.1/
      release.sql
      openapi.yaml
      CHANGELOG.md
```

O arquivo `VERSION` na raiz é lido pelo CI/CD para tag da imagem Docker
e injetar `APP_VERSION` nas variáveis de ambiente do build.

### Duas consolidações de migration — momentos distintos

**1. Antes da revisão** (código entra limpo no code review):
`dba` consolida N migrations incrementais em 1 migration limpa.
Migrations históricas são removidas da pasta `migrations/`.

**2. Na fase release** (declaração de estabilidade):
`dba` gera `specs/releases/vX.Y/release.sql` — arquivo único com
seções `-- UP` e `-- DOWN`. É o baseline histórico imutável desta versão.

### Quando criar uma nova versão de API

Manter o `/api/vN/` existente enquanto só houver mudanças aditivas:
- ✅ Adicionar campo novo na response
- ✅ Adicionar endpoint novo
- ✅ Adicionar parâmetro opcional
- ❌ Remover campo da response → breaking → avaliar nova versão
- ❌ Mudar tipo de campo → breaking
- ❌ Mudar comportamento de código de erro → breaking
- ❌ Renomear rota → breaking

Quando breaking change é detectado pelo `tech-writer`, ele pergunta ao
arquiteto: versionar (criar `/api/v2/`) ou depreciar com prazo?
- **Versionar**: manter `/api/v1/` funcionando e criar `/api/v2/` com o novo contrato
- **Depreciar**: manter `/api/v1/` com header `Deprecation: true` e prazo definido

Enquanto o único consumidor for o frontend construído junto, a decisão de
versionar vs. adaptar o frontend na mesma entrega é do dono do produto.
