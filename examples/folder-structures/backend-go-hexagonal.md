# Exemplo de estrutura de pastas: Backend Go + Gin + Hexagonal

```
backend/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── domain/
│   │   ├── processo.go              # entidade + invariantes
│   │   └── erros.go                  # erros de domínio (ErrProcessoJaConcluido, etc)
│   ├── usecase/
│   │   ├── command/
│   │   │   ├── criar_processo.go
│   │   │   └── criar_processo_test.go
│   │   └── query/
│   │       ├── buscar_processo.go
│   │       └── buscar_processo_test.go
│   ├── port/
│   │   ├── processo_repository.go    # interface
│   │   ├── cache.go                  # interface
│   │   └── event_publisher.go        # interface
│   └── adapter/
│       ├── http/
│       │   ├── processo_handler.go
│       │   ├── middleware_metricas.go
│       │   └── middleware_erro.go
│       ├── postgres/
│       │   ├── processo_repository.go
│       │   └── migrations/
│       │       ├── 000001_create_processo.up.sql
│       │       └── 000001_create_processo.down.sql
│       └── redis/
│           └── cache.go
├── go.mod
└── Dockerfile
```

Nomes de arquivo em `snake_case` minúsculo (convenção de arquivo Go,
diferente da convenção de identificador — ver
`examples/naming-conventions/backend-go.md`).
