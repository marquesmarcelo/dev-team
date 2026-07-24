---
name: backend-go
description: Use ao implementar backend em Go com Gin, quando project.config.md indicar esta stack. Cobre estrutura de pastas hexagonal em Go, convenções do Gin, uso de sqlx, geração de UUIDv7, e idiomas específicos da linguagem.
---

# Backend: Go + Gin + Hexagonal

> Convenção de nomenclatura completa em
> `examples/naming-conventions/backend-go.md` — leia antes de nomear
> tipos, funções ou arquivos. Exemplo de árvore de pastas completa em
> `examples/folder-structures/backend-go-hexagonal.md`.

## Estrutura de pastas
```
/internal
  /domain      → entidades e regras de negócio puras, sem dependência externa
  /usecase
    /command
        /<entidade>   → ex: processo/, usuario/, conta/
    /query
        /<entidade>   → ex: processo/, usuario/, conta/
  /port        → interfaces (ex: UserRepository, NotificationSender, Cache, EventPublisher)
  /adapter
    /http      → handlers Gin (entrada)
    /postgres  → implementação real dos repositórios via sqlx (saída)
    /redis     → implementação da interface Cache
    /migrations → golang-migrate, pares *.up.sql / *.down.sql
```

## Convenções específicas de Go
- `/domain` e `/usecase` nunca importam `github.com/gin-gonic/gin`,
  `github.com/jmoidx/sqlx`, nem qualquer driver de banco.
- Interfaces de `/port` pequenas e específicas (ex: `ProcessoFinder` em vez
  de um `ProcessoRepository` genérico, quando o use case só precisa buscar)
  — Interface Segregation natural do Go.
- Geração de UUIDv7: biblioteca `github.com/google/uuid` (suporte a v7
  desde a v1.6+) ou `github.com/gofrs/uuid/v5`, sempre dentro de
  `/domain`, nunca delegado ao banco.
- Acesso a dados via **sqlx**: `sqlx.Get`/`sqlx.Select` para queries
  simples; SQL escrito e revisado manualmente para queries complexas
  (relatórios, agregações, joins pesados). Nunca um ORM completo
  (GORM, ent) — viola a decisão de evitar overhead/imprevisibilidade de
  performance do ORM.
- Migrations via `golang-migrate/migrate`, CLI ou biblioteca embutida.
- Handlers Gin finos: parseiam request (`c.ShouldBindJSON`), chamam o use
  case, formatam response (`c.JSON`). Nenhuma regra de negócio no handler.
- Erros seguem o formato definido em `project.config.md` (seção "Padrão de
  comunicação") — um único middleware de erro centraliza a tradução de
  erro de domínio para o formato JSON de resposta.
- Métricas: `prometheus/client_golang`, middleware Gin único e global.
- Circuit breaker: `github.com/sony/gobreaker` (ou equivalente), aplicado
  dentro do adapter que chama o serviço externo.

## Value Objects em Go (ver CLAUDE.md para o conceito)
> Exemplos concretos completos em `examples/naming-conventions/value-objects-go.md`.

Value Objects vivem em `/internal/domain/valueobject/`.
Em Go, implementados como structs com campos não-exportados e construtor
que valida na criação:

```go
// /internal/domain/valueobject/email.go

package valueobject

import (
    "fmt"
    "net/mail"
)

// Email — Value Object. Imutável após criação.
// Campos não-exportados: ninguém muda sem passar pelo construtor.
type Email struct {
    valor string
}

// NewEmail valida e cria — nunca retorna um Email inválido.
func NewEmail(s string) (Email, error) {
    if _, err := mail.ParseAddress(s); err != nil {
        return Email{}, fmt.Errorf("email inválido: %q", s)
    }
    return Email{valor: s}, nil
}

// String — representação para serialização/log
func (e Email) String() string { return e.valor }

// Equals — igualdade por valor, não por ponteiro
func (e Email) Equals(other Email) bool { return e.valor == other.valor }

// MarshalJSON / UnmarshalJSON — para trafegar em filas e APIs
func (e Email) MarshalJSON() ([]byte, error) {
    return json.Marshal(e.valor)
}
func (e *Email) UnmarshalJSON(data []byte) error {
    var s string
    if err := json.Unmarshal(data, &s); err != nil { return err }
    v, err := NewEmail(s)
    if err != nil { return err }
    *e = v
    return nil
}
```

```go
// /internal/domain/valueobject/dinheiro.go

type Moeda string
const (
    BRL Moeda = "BRL"
    USD Moeda = "USD"
)

type Dinheiro struct {
    centavos int64  // sempre em centavos para evitar float imprecision
    moeda    Moeda
}

func NewDinheiro(centavos int64, moeda Moeda) (Dinheiro, error) {
    if centavos < 0 {
        return Dinheiro{}, fmt.Errorf("valor não pode ser negativo")
    }
    return Dinheiro{centavos: centavos, moeda: moeda}, nil
}

// Soma — retorna novo Dinheiro, nunca muta o original
func (d Dinheiro) Soma(outro Dinheiro) (Dinheiro, error) {
    if d.moeda != outro.moeda {
        return Dinheiro{}, fmt.Errorf("moedas incompatíveis: %s e %s", d.moeda, outro.moeda)
    }
    return Dinheiro{centavos: d.centavos + outro.centavos, moeda: d.moeda}, nil
}
```

### Como o handler Gin usa Value Objects

```go
// handler recebe string bruta → converte para Value Object → propaga 400 se inválido
func (h *UsuarioHandler) Criar(c *gin.Context) {
    var req CriarUsuarioRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, ErrorResponse{Code: "REQUEST_INVALIDO", Message: err.Error()})
        return
    }
    // conversão imediata para Value Object — nunca passa string bruta para o use case
    email, err := valueobject.NewEmail(req.Email)
    if err != nil {
        c.JSON(400, ErrorResponse{Code: "EMAIL_INVALIDO", Message: err.Error()})
        return
    }
    // use case recebe tipo rico, não string
    out, err := h.useCase.Execute(ctx, CriarUsuarioInput{Email: email})
    // ...
}
```

### Identificar candidatos durante o design (responsabilidade do arquiteto)
Ver tabela de candidatos em CLAUDE.md — seção "Value Objects".

## OpenAPI / Swagger (gerado automaticamente, não escrito à mão)

Use **`swaggo/swag`** para gerar `openapi.yaml`/`swagger.json` a partir
de comentários no código. O arquivo gerado é o que o `tech-writer` mantém
como fonte de verdade — nunca escrever o YAML à mão.

```bash
# Instalar (uma vez por projeto)
go install github.com/swaggo/swag/cmd/swag@latest

# Gerar/atualizar a documentação
docker compose run --rm backend swag init -g cmd/api/main.go -o docs/

# Acessar a UI em desenvolvimento
# http://localhost:3001/swagger/index.html
```

Comentário mínimo por handler:
```go
// CriarProcesso godoc
// @Summary      Criar processo
// @Tags         processos
// @Accept       json
// @Produce      json
// @Param        body body CriarProcessoRequest true "Dados do processo"
// @Success      201 {object} ProcessoResponse
// @Failure      400 {object} ErrorResponse
// @Failure      403 {object} ErrorResponse
// @Router       /processos [post]
func (h *ProcessoHandler) Criar(c *gin.Context) { ... }
```

O arquivo `docs/swagger.yaml` é versionado no repositório e atualizado a
cada mudança de handler. O `tech-writer` usa esse arquivo como base para o
`openapi.yaml` final.

## Observabilidade: Prometheus + endpoints de saúde

**Middleware global de métricas HTTP** (registrado uma única vez na
inicialização, nunca por handler):

```go
// adapter/http/middleware_metricas.go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequests = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total de requisições HTTP",
    }, []string{"method", "path", "status"})

    httpDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "Duração das requisições HTTP",
        Buckets: prometheus.DefBuckets,
    }, []string{"method", "path"})
)

func MetricasMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        timer := prometheus.NewTimer(httpDuration.WithLabelValues(c.Request.Method, c.FullPath()))
        c.Next()
        timer.ObserveDuration()
        httpRequests.WithLabelValues(c.Request.Method, c.FullPath(),
            strconv.Itoa(c.Writer.Status())).Inc()
    }
}
```

**Endpoints obrigatórios** registrados na inicialização:
```go
r.GET("/metrics", gin.WrapH(promhttp.Handler()))  // Prometheus scrape
r.GET("/healthz", func(c *gin.Context) {           // liveness probe
    c.JSON(200, gin.H{"status": "ok"})
})
r.GET("/readyz", func(c *gin.Context) {            // readiness probe
    // verificar conexão com banco e Redis antes de 200
    c.JSON(200, gin.H{"status": "ok"})
})
```

## Observabilidade e documentação de API (ver CLAUDE.md para as regras)

As regras universais (o quê e por quê) estão em `CLAUDE.md`. Esta seção
documenta apenas como implementar nesta stack:

**Prometheus:** `prometheus/client_golang` + middleware Gin global.
Lib do middleware: `github.com/zsais/go-gin-prometheus` ou implementação
própria conforme exemplo na skill. Endpoint: `/metrics`.

**Health checks:** `/healthz` (fixo 200) e `/readyz` (verifica banco + Redis).

**OpenAPI:** `swaggo/swag` — comentários `// @Summary` nos handlers.
```bash
docker compose run --rm backend swag init -g cmd/api/main.go -o docs/
```
UI: `/swagger/index.html`.

## Endpoint /version (obrigatório desde o primeiro commit)

```go
// adapter/http/version_handler.go
import (
    "encoding/json"
    "net/http"
    "os"
    "time"
)

type VersionResponse struct {
    App       string `json:"app"`
    Backend   string `json:"backend"`
    Frontend  string `json:"frontend"`
    BuildDate string `json:"buildDate"`
    Commit    string `json:"commit"`
}

func VersionHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(VersionResponse{
        App:       os.Getenv("APP_NAME"),
        Backend:   os.Getenv("APP_VERSION"),   // injetado no build via ldflags
        Frontend:  os.Getenv("FRONTEND_VERSION"),
        BuildDate: os.Getenv("BUILD_DATE"),
        Commit:    os.Getenv("GIT_COMMIT"),
    })
}

// main.go — registrar a rota
r.GET("/version", gin.WrapF(VersionHandler))
```

Variáveis injetadas no build pelo CI/CD:
```makefile
# Dockerfile ou Makefile
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_COMMIT=$(git rev-parse --short HEAD)
APP_VERSION=$(cat VERSION)   # arquivo VERSION na raiz do projeto
```

## Paginação e ordenação em queries de listagem (obrigatório, ver CLAUDE.md)

Toda query de listagem (`/usecase/query`) recebe parâmetros de paginação
e ordenação como parte da assinatura, nunca hardcoded ou esquecido:

```go
type ListarProcessosInput struct {
    Page     int    // 1-based; default 1 se omitido/inválido
    PageSize int    // default 20; clamp no máximo (ex: 100)
    Sort     string // se vazio, usa a ordenação padrão definida em design.md
                     // (ex: "criado_em") — nunca fica "sem ordenação"
    Order    string // "asc" ou "desc"; se Sort vier vazio, Order também
                     // assume o padrão de design.md (ex: "desc"), não "asc" fixo
}

type ListarProcessosOutput struct {
    Items      []Processo
    Total      int
    Page       int
    PageSize   int
    TotalPages int
}
```

No adapter de persistência, a allowlist de ordenação fica explícita —
**nunca** interpolar `sort` direto na query:

```go
var colunasOrdenaveis = map[string]string{
    "criado_em": "criado_em",
    "descricao": "descricao",
    "status":    "status",
}

// ordenacaoPadrao vem de design.md — definida no domínio do recurso,
// nunca um valor mágico solto no meio do adapter
const (
    ordenacaoPadraoColuna = "criado_em"
    ordenacaoPadraoOrdem  = "desc"
)

func (r *ProcessoRepository) Listar(ctx context.Context, in ListarProcessosInput) (*ListarProcessosOutput, error) {
    sort, order := in.Sort, in.Order
    if sort == "" {
        sort, order = ordenacaoPadraoColuna, ordenacaoPadraoOrdem
    }
    coluna, ok := colunasOrdenaveis[sort]
    if !ok {
        return nil, ErrColunaOrdenacaoInvalida // 400, nunca fallback silencioso pra valor fora da allowlist
    }
    ordem := "ASC"
    if order == "desc" {
        ordem = "DESC"
    }
    offset := (in.Page - 1) * in.PageSize

    query := fmt.Sprintf(
        `SELECT * FROM processo WHERE excluido_em IS NULL ORDER BY %s %s LIMIT $1 OFFSET $2`,
        coluna, ordem, // seguro aqui porque coluna/ordem vêm só da allowlist fixa, nunca do input direto
    )
    // ...
}
```

No handler Gin, parseie e valide antes de passar ao use case:
```go
page := parseIntDefault(c.Query("page"), 1)
pageSize := clamp(parseIntDefault(c.Query("page_size"), 20), 1, 100)
sort := c.Query("sort")     // validado na allowlist dentro do adapter
order := c.DefaultQuery("order", "asc")
```

Resposta sempre com envelope `data`/`meta`, nunca array solto — ver
formato em `CLAUDE.md` → "Paginação e ordenação em listagens".

## Dois Dockerfiles por serviço
> Antes de criar ou atualizar qualquer Dockerfile, leia os exemplos em
> `examples/docker/backend/` — são os arquivos de referência deste projeto.

- `Dockerfile` — produção: multi-stage, imagem final mínima, binário
  compilado estaticamente, sem toolchain Go.
- `Dockerfile.dev` — desenvolvimento: imagem Go completa com `air`,
  não copia código (vem do volume). Ver `examples/docker/backend/Dockerfile.dev`.
- `.air.toml` — configuração do watcher de hot-reload. Ver
  `examples/docker/backend/.air.toml`.

## .dockerignore (obrigatório, criado junto com o Dockerfile)
```
.git
.env
.env.*
tmp/
*.log
load-tests/
e2e/
```

## Comandos sempre via container, nunca assumindo Go instalado na máquina
```bash
docker compose run --rm backend go mod tidy
docker compose run --rm backend go test ./... -cover
docker compose run --rm backend go vet ./...
```
Se um erro de build só se resolve rodando algo na máquina do
desenvolvedor, o `Dockerfile`/`docker-compose.yml` está incompleto —
corrija lá, nunca documente "rode X na sua máquina antes" como solução.

## Migrations automáticas ao subir o ambiente
O `docker-compose.yml` (responsabilidade do `devops`) inclui um serviço
`migrate` que roda golang-migrate contra o banco antes do backend subir:
```yaml
services:
  migrate:
    image: migrate/migrate
    volumes:
      - ./internal/adapter/postgres/migrations:/migrations
    command: ["-path", "/migrations", "-database", "$${POSTGRES_URL}", "up"]
    depends_on:
      postgres:
        condition: service_healthy
  backend:
    depends_on:
      migrate:
        condition: service_completed_successfully
```
Nunca depender do desenvolvedor lembrar de rodar a migration manualmente.

## Script de seed (obrigatório por entidade)
Local: `/internal/adapter/postgres/seed/main.go` (um `cmd` separado) ou
`/cmd/seed/main.go` — popula dados de desenvolvimento plausíveis (nunca
dado real) para toda entidade nova. Executado via:
```bash
docker compose run --rm backend go run ./cmd/seed
```
O `dba` garante que toda migration nova venha acompanhada do seed
correspondente — não é opcional.

## Variável de bypass de autenticação em desenvolvimento
`DEV_SEM_AUTH` (booleana, default `false`/ausente). Quando `true`, o
middleware de autenticação do Gin deixa passar qualquer requisição sem
validar token — implementado como um middleware condicional, nunca como
`if` espalhado em cada handler. Essa variável só pode aparecer no
`docker-compose.yml` de desenvolvimento, nunca em manifesto de produção.

## CORS configurável
`CORS_ALLOWED_ORIGINS` (lista separada por vírgula), lida na
inicialização do servidor e aplicada via middleware CORS do Gin — nunca
hardcoded no código, nunca `*` fora de desenvolvimento.

## Testes

### Use case (unitário — sem banco)
```bash
go test ./usecase/... -cover
```
Mockar interfaces de `/port` com `mockgen` ou manualmente para interfaces pequenas.

### Integração (com banco real — usar banco de teste isolado)

```bash
# Rodar testes de integração
RUN_TESTS=true DATABASE_URL_TEST=postgres://... go test ./adapter/... -tags integration
```

**Fixtures com `t.Cleanup` obrigatório — ver regra em `CLAUDE.md`:**

```go
// testhelpers/fixtures.go
package testhelpers

import (
    "context"
    "testing"
    "database/sql"
    "github.com/google/uuid"
)

// CriarProcesso cria um processo no banco e registra a limpeza via t.Cleanup.
// Quem chama não precisa fazer nada — o dado é removido ao final do teste.
func CriarProcesso(t *testing.T, db *sql.DB, descricao string) uuid.UUID {
    t.Helper()

    id := uuid.New()
    _, err := db.ExecContext(context.Background(),
        `INSERT INTO processo (id, descricao, status, criado_em, atualizado_em)
         VALUES ($1, $2, 'aberto', now(), now())`,
        id, descricao,
    )
    if err != nil {
        t.Fatalf("fixture CriarProcesso: %v", err)
    }

    // Cleanup registrado internamente — nunca deixar para quem chama
    t.Cleanup(func() {
        db.ExecContext(context.Background(),
            `DELETE FROM processo WHERE id = $1`, id,
        )
    })

    return id
}

// BancoDeTeste retorna conexão com o banco de teste e garante cleanup.
func BancoDeTeste(t *testing.T) *sql.DB {
    t.Helper()

    url := os.Getenv("DATABASE_URL_TEST")
    if url == "" {
        t.Skip("DATABASE_URL_TEST não definida — pulando teste de integração")
    }

    db, err := sql.Open("postgres", url)
    if err != nil {
        t.Fatalf("BancoDeTeste: %v", err)
    }

    t.Cleanup(func() { db.Close() })
    return db
}
```

**Uso no teste:**
```go
func TestCriarProcesso_Integração(t *testing.T) {
    db := testhelpers.BancoDeTeste(t)
    id := testhelpers.CriarProcesso(t, db, "Processo de teste")

    // banco limpo automaticamente ao final — t.Cleanup cuida disso
    resultado, err := repo.BuscarPorID(context.Background(), id)
    require.NoError(t, err)
    assert.Equal(t, "Processo de teste", resultado.Descricao)
}
```

### Lint e build
```bash
go vet ./...
golangci-lint run
go test ./... -cover
```
