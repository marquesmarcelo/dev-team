# Exemplo de estrutura de pastas: Backend Python + FastAPI + Hexagonal

```
backend/
  app/
    domain/
      entity/
        processo.py
      valueobject/
        email.py           # Pydantic BaseModel frozen=True
        status_processo.py # Enum com transições
      event/
        processo_criado.py
    usecase/
      command/
        criar_processo.py
        criar_processo_test.py
      query/
        listar_processos.py
        listar_processos_test.py
    port/
      processo_repository.py   # typing.Protocol
      cache.py                  # typing.Protocol
      event_publisher.py        # typing.Protocol
    adapter/
      http/
        processo_router.py      # APIRouter
        middleware.py           # auth, CORS, logging
      sqlalchemy/
        processo_repository.py  # AsyncSession + text() com allowlist de sort
        models.py               # SQLAlchemy ORM models (separado do domain)
      redis/
        cache_adapter.py
    main.py                     # lifespan, routers, CORS, middleware
  tests/
    unit/
      usecase/                  # testes de use case com AsyncMock
    integration/
      adapter/                  # testes contra banco real (pytest-asyncio)
  pyproject.toml
  Dockerfile
  Dockerfile.dev
```

Arquivos em `snake_case` — convenção Python padrão.
Classes em `PascalCase`, variáveis e funções em `snake_case`.
Nenhum `from app.adapter import ...` dentro de `app.domain` ou `app.usecase`.
