---
name: backend-python-fastapi
description: Use ao implementar backend em Python com FastAPI, quando project.config.md indicar esta stack. Cobre estrutura hexagonal em Python, Protocols como ports, injeção de dependência via FastAPI Depends, Pydantic para value objects, SQLAlchemy async para acesso a dados.
---

# Backend: Python + FastAPI + Hexagonal

> Exemplos de Value Objects Python na seção abaixo.

## Estrutura de pastas

```
app/
  domain/
    entity/         # dataclasses com comportamento de negócio
    valueobject/    # email.py, cpf.py, status.py (Enum com transições)
    event/          # Domain Events
  usecase/
    command/
        <entidade>/   # ex: processo/, usuario/
    query/
        <entidade>/   # ex: processo/, usuario/
  port/             # Protocol (interfaces) — ProcessoRepository, Cache, EventPublisher
  adapter/
    http/           # APIRouter do FastAPI (entrada)
    sqlalchemy/     # implementação dos ports de persistência (saída)
    redis/          # implementação do Cache
  main.py           # bootstrap: cria FastAPI + registra routers
```

Regra inegociável: `domain` e `usecase` NUNCA importam de `adapter`.

## Ports como typing.Protocol

Em Python, `Protocol` substitui ABC/interfaces formais — duck typing estrutural:

```python
# port/processo_repository.py
from typing import Protocol
from uuid import UUID
from app.domain.entity.processo import Processo

class ProcessoRepository(Protocol):
    async def salvar(self, processo: Processo) -> None: ...
    async def buscar_por_id(self, id: UUID) -> Processo | None: ...
    async def listar(self, page: int, page_size: int,
                     sort: str, order: str) -> tuple[list[Processo], int]: ...
```

## Value Objects com Pydantic (imutável, valida no construtor)

```python
# domain/valueobject/email.py
from pydantic import BaseModel, field_validator

class Email(BaseModel):
    valor: str

    model_config = {"frozen": True}  # imutável — Pydantic v2

    @field_validator("valor")
    @classmethod
    def validar(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError(f"Email inválido: {v!r}")
        return v

    def __str__(self) -> str:
        return self.valor
```

Status com transições válidas:

```python
# domain/valueobject/status_processo.py
from enum import Enum

_TRANSICOES = {
    "aberto":     ["em_analise", "cancelado"],
    "em_analise": ["concluido", "cancelado"],
    "concluido":  [],
    "cancelado":  [],
}

class StatusProcesso(str, Enum):
    ABERTO = "aberto"
    EM_ANALISE = "em_analise"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"

    def transicionar_para(self, proximo: "StatusProcesso") -> "StatusProcesso":
        if proximo.value not in _TRANSICOES[self.value]:
            raise ValueError(f"Transição inválida: {self} → {proximo}")
        return proximo
```

## Injeção de dependência com FastAPI Depends

```python
# adapter/http/processo_router.py
from fastapi import APIRouter, Depends
from app.port.processo_repository import ProcessoRepository
from app.adapter.sqlalchemy.processo_repository import SQLAlchemyProcessoRepository

router = APIRouter(prefix="/api/v1/processos")

def get_repository() -> ProcessoRepository:
    return SQLAlchemyProcessoRepository()  # substituível por mock em testes

@router.post("/", status_code=201)
async def criar(
    body: CriarProcessoRequest,
    repo: ProcessoRepository = Depends(get_repository),
):
    use_case = CriarProcessoUseCase(repo)
    return await use_case.executar(body.to_command())
```

## Acesso a dados: SQLAlchemy async + SQL customizado

```python
# adapter/sqlalchemy/processo_repository.py
COLUNAS_ORDENAVEIS = {"criado_em", "descricao", "status"}

async def listar(self, page, page_size, sort, order):
    coluna = sort if sort in COLUNAS_ORDENAVEIS else "criado_em"
    ordem = "DESC" if order == "desc" else "ASC"
    resultado = await self._session.execute(
        text(f"SELECT ... FROM processo WHERE excluido_em IS NULL "
             f"ORDER BY {coluna} {ordem} LIMIT :limit OFFSET :offset"),
        {"limit": page_size, "offset": (page - 1) * page_size},
    )
```

Allowlist obrigatória — nunca interpolar `sort` diretamente na query.

## OpenAPI / Swagger (FastAPI gera automaticamente — nenhuma lib extra)

FastAPI gera `openapi.json` automaticamente a partir das type hints e
modelos Pydantic. Configure título, versão e descrição uma única vez:

```python
# main.py
from fastapi import FastAPI

app = FastAPI(
    title="Nome do Sistema",
    version="1.0.0",
    description="Descrição do sistema",
    docs_url="/swagger",       # UI Swagger em /swagger
    redoc_url="/redoc",        # UI ReDoc em /redoc
    openapi_url="/openapi.json",
)
```

A documentação é gerada ao vivo — **nenhum arquivo precisa ser escrito à
mão**. O `tech-writer` exporta o `/openapi.json` para o arquivo
`docs/openapi.yaml` versionado no repositório:

```bash
docker compose run --rm backend python -c \
  "import json, yaml; from app.main import app; \
   open('docs/openapi.yaml','w').write(yaml.dump(app.openapi()))"
```

Docstring por endpoint (usada automaticamente no Swagger):
```python
@router.post("/processos", status_code=201, response_model=ProcessoResponse,
             summary="Criar processo", tags=["processos"])
async def criar_processo(body: CriarProcessoRequest, ...):
    """
    Cria um novo processo administrativo.

    - **descricao**: texto descritivo do processo
    - **responsavel_id**: UUID do usuário responsável
    """
```

## Observabilidade: Prometheus + endpoints de saúde

Use **`prometheus-fastapi-instrumentator`** — registra middleware global
automático, sem precisar anotar cada endpoint:

```python
# main.py
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(...)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

**Endpoints de saúde** (obrigatórios):
```python
@app.get("/healthz", tags=["health"], include_in_schema=False)
async def healthz():
    """Liveness probe — o processo está vivo."""
    return {"status": "ok"}

@app.get("/readyz", tags=["health"], include_in_schema=False)
async def readyz(db: AsyncSession = Depends(get_db)):
    """Readiness probe — dependências (banco, Redis) estão acessíveis."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="banco indisponível")
```

## Endpoint /version (obrigatório desde o primeiro commit)

```python
# adapter/http/version_router.py
import os
from fastapi import APIRouter

router = APIRouter()

@router.get("/version", include_in_schema=False)
async def version():
    return {
        "app":       os.getenv("APP_NAME", ""),
        "backend":   os.getenv("APP_VERSION", ""),
        "frontend":  os.getenv("FRONTEND_VERSION", ""),
        "buildDate": os.getenv("BUILD_DATE", ""),
        "commit":    os.getenv("GIT_COMMIT", ""),
    }
```

## Testes

```bash
docker compose run --rm backend pytest --cov=app
```

Use `pytest-asyncio` para use cases assíncronos. Mock os ports via
`unittest.mock.AsyncMock` ou implementação in-memory.

## APP_ENV e CORS

```python
APP_ENV = os.getenv("APP_ENV", "production")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if APP_ENV == "development":
        return await call_next(request)
    # validar JWT...
```

## Dois Dockerfiles

- `Dockerfile` — produção: multi-stage, imagem final `python:3.12-slim`.
- `Dockerfile.dev` — dev: instala `watchfiles` ou `uvicorn --reload`.
