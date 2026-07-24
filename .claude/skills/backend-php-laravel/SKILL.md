---
name: backend-php-laravel
description: Use ao implementar backend em PHP com Laravel, quando project.config.md indicar esta stack. Cobre estrutura hexagonal em PHP, injeção de dependência via Service Container do Laravel, Eloquent somente para mapeamento (SQL customizado para queries complexas), Value Objects com readonly classes, CQRS, OpenAPI via l5-swagger, Prometheus via spatie/laravel-prometheus, e idiomas específicos da linguagem.
---

# Backend: PHP + Laravel + Hexagonal

> Padrões universais (hexagonal, SOLID, CQRS, UUID, stateless, Value Objects,
> ABAC, auditoria, observabilidade, OpenAPI) estão em `CLAUDE.md` — não são
> repetidos aqui. Esta skill documenta apenas o que é específico do PHP/Laravel.

## Estrutura de pastas

```
app/
├── Domain/
│   ├── Entity/           # entidades com identidade e comportamento
│   ├── ValueObject/      # readonly classes — imutáveis por definição
│   ├── Port/             # interfaces (Contracts) de repositório, cache, evento
│   └── Exception/        # exceções de domínio tipadas
├── Application/
│   ├── Command/
│   │   └── <Entidade>/   # ex: Processo/, Usuario/, Conta/
│   │       ├── CriarProcessoUseCase.php
│   │       └── AtualizarProcessoUseCase.php
│   └── Query/
│       └── <Entidade>/   # ex: Processo/, Usuario/
│           ├── ListarProcessosUseCase.php
│           └── BuscarProcessoUseCase.php
├── Adapter/
│   ├── Http/             # Controllers Laravel — finos, sem lógica de negócio
│   ├── Persistence/      # implementações dos ports usando Query Builder
│   │   └── Migrations/   # migrations Laravel com up() e down() obrigatórios
│   ├── Cache/            # Redis via Laravel Cache
│   └── Messaging/        # publishers de fila (Laravel Queues / RabbitMQ)
├── Infrastructure/
│   └── Providers/
│       └── AppServiceProvider.php  # binding dos ports no Service Container
└── Http/
    └── Requests/         # Form Requests para validação
```

Regra inegociável: `Domain/` e `Application/` nunca importam de `Adapter/`.

## Injeção de dependência via Service Container

```php
// Infrastructure/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->bind(
        ProcessoRepository::class,  // Port (interface)
        SQLProcessoRepository::class // Adapter (implementação real)
    );
    $this->app->bind(Cache::class, RedisCache::class);
    $this->app->bind(EventPublisher::class, QueueEventPublisher::class);
}

// Domain/Port/ProcessoRepository.php (interface)
interface ProcessoRepository
{
    public function salvar(Processo $processo): void;
    public function buscarPorId(UuidVO $id): ?Processo;
}

// Adapter/Http/ProcessoController.php — DI automática via type hint
class ProcessoController extends Controller
{
    public function __construct(
        private readonly CriarProcessoUseCase $criarProcesso
    ) {}

    public function store(CriarProcessoRequest $request): JsonResponse
    {
        $resultado = ($this->criarProcesso)(new CriarProcessoCommand(
            descricao: $request->validated('descricao'),
            responsavelId: UuidVO::from($request->validated('responsavel_id')),
        ));
        return response()->json($resultado, 201);
    }
}
```

## Value Objects com readonly classes (PHP 8.2+)

```php
// Domain/ValueObject/Email.php
final readonly class Email
{
    public function __construct(public readonly string $valor)
    {
        if (!filter_var($valor, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Email inválido: {$valor}");
        }
    }

    public function equals(self $other): bool
    {
        return $this->valor === $other->valor;
    }

    public function __toString(): string
    {
        return $this->valor;
    }
}

// Domain/ValueObject/UuidVO.php
final readonly class UuidVO
{
    public function __construct(public readonly string $valor)
    {
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $valor)) {
            throw new \InvalidArgumentException("UUID inválido: {$valor}");
        }
    }

    public static function generate(): self
    {
        // Gerar UUIDv7 na aplicação, nunca delegar ao banco
        return new self(\Ramsey\Uuid\Uuid::uuid7()->toString());
    }

    public static function from(string $valor): self
    {
        return new self($valor);
    }
}
```

## Acesso a dados: Query Builder (não Eloquent ORM para queries complexas)

- **Queries simples (CRUD):** `DB::table('processos')->insert(...)` ou
  Eloquent Model como *mapeador de resultado* — não como entidade de domínio.
- **Queries complexas** (relatórios, agregações, joins pesados): SQL puro via
  `DB::select(DB::raw(...))` com parâmetros bindados — nunca concatenação.
- **Regra da allowlist de ordenação** (igual às outras stacks):

```php
private const COLUNAS_ORDENAVEIS = ['criado_em', 'descricao', 'status'];

public function listar(ListarProcessosQuery $query): ProcessoPage
{
    if (!in_array($query->sort, self::COLUNAS_ORDENAVEIS, true)) {
        throw new \InvalidArgumentException("Coluna de ordenação inválida");
    }
    // $query->sort é seguro aqui — está na allowlist
    $resultados = DB::table('processos')
        ->whereNull('excluido_em')
        ->orderBy($query->sort, $query->order)
        ->paginate($query->pageSize);
}
```

## Migrations com up() e down() obrigatórios

```php
// Migrations incluem sempre o down() funcional
public function up(): void
{
    Schema::create('processo', function (Blueprint $table) {
        $table->uuid('id')->primary();           // UUIDv7 gerado na aplicação
        $table->text('descricao');
        $table->string('status', 50);
        $table->uuid('responsavel_id')->index();
        $table->foreign('responsavel_id')->references('id')->on('usuario');
        $table->timestampsTz();                  // criado_em + atualizado_em
        $table->softDeletes('excluido_em');      // deleção lógica
    });
}

public function down(): void
{
    Schema::dropIfExists('processo');
}
```

**Importante:** `softDeletes('excluido_em')` implementa a deleção lógica do
projeto automaticamente — `Model::query()` já filtra `excluido_em IS NULL`.
Verificar que isso está ativo em todo Model usado para leitura.

## Observabilidade e documentação de API (ver CLAUDE.md para as regras)

**Prometheus:** `spatie/laravel-prometheus`
```bash
composer require spatie/laravel-prometheus
php artisan vendor:publish --tag="prometheus-config"
```
Endpoints: `/metrics` (Prometheus), `/up` (liveness padrão Laravel),
`/ready` (readiness customizado verificando banco + Redis).

**OpenAPI:** `darkaonline/l5-swagger`
```bash
composer require darkaonline/l5-swagger
php artisan l5-swagger:generate
```
Anotações nos controllers:
```php
/**
 * @OA\Post(
 *   path="/api/v1/processos",
 *   summary="Criar processo",
 *   tags={"processos"},
 *   @OA\Response(response=201, description="Processo criado"),
 *   @OA\Response(response=403, description="Acesso negado")
 * )
 */
```
UI: `/api/documentation`. Exportar para `docs/openapi.yaml`:
```bash
docker compose run --rm backend php artisan l5-swagger:generate
cp storage/api-docs/api-docs.json docs/openapi.json
```

## Endpoint /version (obrigatório desde o primeiro commit)

```php
// Adapter/Http/VersionController.php
class VersionController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'app'       => env('APP_NAME'),
            'backend'   => env('APP_VERSION'),
            'frontend'  => env('FRONTEND_VERSION'),
            'buildDate' => env('BUILD_DATE'),
            'commit'    => env('GIT_COMMIT'),
        ]);
    }
}

// routes/api.php
Route::get('/version', VersionController::class);
```

## Testes

```bash
docker compose run --rm backend php artisan test --coverage
```

- Use cases: `PHPUnit` com mocks via `Mockery` ou `createMock()`.
- Feature tests (handler): `php artisan test` com `RefreshDatabase`.
- Cobertura mínima: 80% (configurado no `phpunit.xml`).

## Dois Dockerfiles

- `Dockerfile` — produção: `php:8.3-fpm-alpine` + Nginx, multi-stage,
  sem dev tools.
- `Dockerfile.dev` — desenvolvimento: `php:8.3-fpm` + Xdebug +
  `php-fpm --nodaemonize` com volume montado.

```dockerfile
# Dockerfile.dev
FROM php:8.3-fpm
RUN pecl install xdebug && docker-php-ext-enable xdebug
WORKDIR /app
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
CMD ["php", "-S", "0.0.0.0:3001", "-t", "public"]
```

Hot-reload em PHP: o servidor built-in do PHP relê os arquivos a cada
requisição — não precisa de watcher separado. Volume montado é suficiente.

## Convenções de nomenclatura PHP

- **Classes, Interfaces, Traits:** `PascalCase`
- **Métodos e funções:** `camelCase`
- **Variáveis:** `camelCase`
- **Constantes de classe:** `SCREAMING_SNAKE_CASE`
- **Arquivos:** um por classe, nome igual à classe (`ProcessoController.php`)
- **Namespaces:** seguem a estrutura de diretórios (`App\Domain\Entity`)
- Seguir **PSR-1, PSR-4 e PSR-12** (verificado via `./vendor/bin/phpcs`)

## Lint e build

```bash
docker compose run --rm backend composer install
docker compose run --rm backend ./vendor/bin/phpcs       # estilo PSR-12
docker compose run --rm backend ./vendor/bin/phpstan analyse  # análise estática
docker compose run --rm backend php artisan test --coverage
```
