# Exemplos de Diagramas Mermaid

Referência para `arquiteto`, `dba` e `tech-writer`. Todos os exemplos
usam entidades do domínio típico deste projeto. Cole num bloco
` ```mermaid ``` ` nos arquivos `.md` — GitHub, GitLab e VS Code
renderizam nativamente.

---

## 1. erDiagram — Schema do banco

Use para documentar as tabelas criadas/alteradas em `specs/<feature>/diagrama-banco.md`
e o diagrama consolidado em `docs/diagrama-banco.md`.

```mermaid
erDiagram
  USUARIO {
    uuid id PK
    text nome
    text email UK
    text senha_hash
    uuid perfil_id FK
    timestamptz criado_em
    timestamptz atualizado_em
    timestamptz excluido_em
  }

  PERFIL {
    uuid id PK
    text nome UK
    timestamptz criado_em
    timestamptz excluido_em
  }

  PERMISSAO {
    uuid id PK
    text codigo UK
    text descricao
  }

  POLITICA_ABAC {
    uuid id PK
    uuid perfil_id FK
    uuid permissao_id FK
    jsonb restricoes
    bool ativo
    timestamptz criado_em
    timestamptz excluido_em
  }

  PROCESSO {
    uuid id PK
    text numero_protocolo UK
    text descricao
    text status
    uuid responsavel_id FK
    timestamptz criado_em
    timestamptz atualizado_em
    timestamptz excluido_em
  }

  AUDITORIA {
    uuid id PK
    uuid usuario_id FK
    text role
    text acao
    text recurso_tipo
    uuid recurso_id
    text resultado
    jsonb detalhes
    inet ip_origem
    timestamptz executado_em
  }

  USUARIO }o--|| PERFIL : "tem"
  POLITICA_ABAC }o--|| PERFIL : "pertence a"
  POLITICA_ABAC }o--|| PERMISSAO : "concede"
  PROCESSO }o--|| USUARIO : "responsavel"
  AUDITORIA }o--o| USUARIO : "gerada por"
```

---

## 2. sequenceDiagram — Fluxo de uma requisição

Use em `design.md` para documentar como as camadas interagem.

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant BE as Backend
  participant AB as ABAC Engine
  participant DB as Postgres
  participant RD as Redis
  participant AU as Auditoria

  FE->>BE: POST /api/v1/processos { descricao, responsavel_id }
  BE->>BE: Validar JWT → extrair subject + role

  BE->>AB: CanAccess(subject, "Processo", "criar", env)
  AB->>DB: Buscar política para { role, ação }
  DB-->>AB: politica { horario: 8-18, localidade: SP }
  AB->>AB: Avaliar atributos de ambiente (hora atual, IP)
  AB-->>BE: permitido=true

  BE->>DB: INSERT processo (id UUIDv7, descricao, status=aberto)
  DB-->>BE: processo criado

  BE->>RD: DEL cache:processos:lista
  BE->>AU: Log { ação: criar_processo, resultado: sucesso }

  BE-->>FE: 201 { id, descricao, status, criado_em }

  note over FE,BE: Fluxo de erro — ABAC nega
  FE->>BE: POST /api/v1/processos (fora do horário)
  BE->>AB: CanAccess(...)
  AB-->>BE: permitido=false, motivo: horario_invalido
  BE->>AU: Log { ação: criar_processo, resultado: negado }
  BE-->>FE: 403 { error: { code: "ACESSO_NEGADO" } }
```

---

## 3. stateDiagram-v2 — Máquina de estados

Use para documentar o ciclo de vida de uma entidade ou fluxo de autorização.

```mermaid
stateDiagram-v2
  [*] --> Aberto: criar (Analista)

  Aberto --> EmAnalise: iniciar_analise (Analista)
  Aberto --> Cancelado: cancelar (Analista | Gerente)

  EmAnalise --> Aprovado: aprovar (Gerente)
  EmAnalise --> Rejeitado: rejeitar (Gerente)
  EmAnalise --> Cancelado: cancelar (Gerente)

  Aprovado --> [*]
  Rejeitado --> [*]
  Cancelado --> [*]

  note right of EmAnalise
    ABAC: só Gerente pode aprovar
    Restrição: horário 08:00-18:00
  end note
```

---

## 4. flowchart — Fluxo de decisão / arquitetura de componentes

Use para documentar decisões de negócio ou arquitetura de uma feature.

```mermaid
flowchart TD
  A[Request com JWT] --> B{Token válido?}
  B -->|Não| C[401 Unauthorized]
  B -->|Sim| D{Extrair role, sub, exp}

  D --> E{ABAC: tem permissão?}
  E -->|Não| F[403 Forbidden]
  E -->|Sim| G{Restrição de horário?}

  G -->|Fora do horário| H[403 Forbidden + detalhe horário]
  G -->|Dentro do horário| I{Restrição de localidade?}

  I -->|IP fora da zona| J[403 Forbidden + detalhe localidade]
  I -->|IP permitido| K[Executar use case]

  K --> L[Registrar auditoria: sucesso]
  K --> M{Publicar evento?}
  M -->|Sim| N[Outbox → Fila]
  M -->|Não| O[Response 200/201]
  N --> O

  F --> P[Registrar auditoria: negado]
  H --> P
  J --> P
```

---

## 5. flowchart — Arquitetura hexagonal de uma feature

```mermaid
flowchart LR
  subgraph Entrada
    HTTP[Handler Gin]
  end

  subgraph Aplicação
    CMD[CriarProcesso\nUseCase]
    QRY[ListarProcessos\nUseCase]
  end

  subgraph Ports
    REPO[ProcessoRepository\ninterface]
    CACHE[Cache\ninterface]
    PUB[EventPublisher\ninterface]
    ABAC[AuthorizationChecker\ninterface]
  end

  subgraph Adapters
    PG[(Postgres)]
    RD[(Redis)]
    MQ([RabbitMQ])
    PE[PolicyEngine]
  end

  HTTP --> CMD
  HTTP --> QRY
  CMD --> REPO
  CMD --> PUB
  CMD --> ABAC
  QRY --> REPO
  QRY --> CACHE
  REPO --> PG
  CACHE --> RD
  PUB --> MQ
  ABAC --> PE
  PE --> PG
```

---

## Dicas de sintaxe Mermaid (erros comuns)

| Situação | Certo | Errado |
|---|---|---|
| Seta em sequence (requisição) | `->>` | `->` |
| Seta em sequence (resposta) | `-->>` | `-->` |
| Node ID com espaço | `A[Meu Node]` | `Meu Node[...]` |
| Relação ER um-para-muitos | `\|\|--o{` | `1--N` |
| Fechar bloco | `end` | (esquecer fecha = parse error) |
| Caracteres especiais em label | `A["texto: especial"]` | `A[texto: especial]` |
| **Ponto e vírgula no texto** | `#59;` (entidade HTML oficial) ou reescrever sem `;` | `;` diretamente no texto — o parser interpreta como fim de linha e quebra o diagrama |

### Ponto e vírgula em labels de sequenceDiagram

O `;` tem papel especial no Mermaid: pode substituir quebra de linha para
definir múltiplas instruções. Por isso **não pode aparecer diretamente**
no texto de uma mensagem ou nota.

**Padrão adotado neste projeto: `Note` para condições e detalhes.**

É a opção mais legível — o label da seta fica curto, as condições ficam
numa nota posicionada logo abaixo, visualmente associada à seta.

```
sequenceDiagram
  FE->>FE: redireciona conforme função
  Note right of FE: aluno → /painel-aluno
  Note right of FE: demais → /app
```

**Tipos de Note disponíveis:**
```
Note right of A: texto          → nota à direita do participante A
Note left of A: texto           → nota à esquerda do participante A
Note over A: texto              → nota sobre o participante A
Note over A,B: texto            → nota cobrindo de A até B
```

**Se o `;` for inevitável:** use `#59;` (entidade HTML oficial).
```
FE->>FE: redireciona (aluno → /painel-aluno#59; demais → /app)
```

**Regra prática:**
- Label da seta: curto e sem `;`
- Condições, rotas, detalhes: `Note` logo abaixo da seta
