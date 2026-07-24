---
name: backend-nestjs
description: Use ao implementar backend em NestJS/Node.js quando project.config.md indicar esta stack. Cobre estrutura hexagonal com módulos NestJS, DTOs com class-validator, guards JWT/ABAC, interceptors, OpenAPI via @nestjs/swagger, Prometheus, endpoint /version e padrão de fixtures com afterEach. Baseado em nestjs-patterns (ECC/affaan-m) e adaptado aos padrões deste projeto.
---

# Backend NestJS + Node.js

> Padrões universais do projeto (`CLAUDE.md`) se aplicam: UUID, deleção lógica,
> hexagonal, CQRS-leve, Value Objects, etc. Esta skill cobre o que é
> específico do NestJS.

## Estrutura de pastas — hexagonal adaptada ao NestJS

```
src/
  domain/
    entity/             ← entidades e Value Objects (classes com validação)
    port/               ← interfaces (repository, services externos)
    usecase/
      command/<entidade>/   ← CriarProcessoUseCase, etc.
      query/<entidade>/     ← ListarProcessosUseCase, etc.

  adapter/
    http/               ← controllers NestJS (finos — só parse + delegação)
      dto/              ← DTOs de request/response com class-validator
      <entidade>.controller.ts
      <entidade>.module.ts
    postgres/           ← implementação de repositórios com TypeORM/Prisma
      <entidade>.repository.ts
    external/           ← clientes de serviços externos

  common/               ← transversais (filtros, guards globais, interceptors)
    filters/
    guards/
    interceptors/
    pipes/

  config/               ← configuração de ambiente com validação Zod/Joi

  app.module.ts
  main.ts
```

**Regra:** Controllers orquestram parse HTTP → use case → response DTO.
Lógica de negócio fica nos use cases, nunca nos controllers.

---

## Bootstrap e configuração global

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  // Validação global de DTOs — obrigatória
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // remove campos não declarados no DTO
    forbidNonWhitelisted: true, // erro se vier campo extra (não só ignorar)
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  // Serialização global — oculta campos marcados com @Exclude()
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector))
  )

  // Filtro global de exceções (shape consistente)
  app.useGlobalFilters(new HttpExceptionFilter())

  // OpenAPI — gerado automaticamente, nunca escrito à mão
  const config = new DocumentBuilder()
    .setTitle(process.env.APP_NAME ?? 'API')
    .setVersion(process.env.APP_VERSION ?? '0.0.1')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
```

---

## Módulos, Controllers e Providers

```typescript
// adapter/http/processo.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([ProcessoEntity])],
  controllers: [ProcessoController],
  providers: [
    ProcessoRepository,             // implementação do port
    CriarProcessoUseCase,
    ListarProcessosUseCase,
    BuscarProcessoPorIdUseCase,
    ExcluirProcessoUseCase,
  ],
})
export class ProcessoModule {}

// adapter/http/processo.controller.ts
@ApiTags('processos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/processos')
export class ProcessoController {
  constructor(
    private readonly criar: CriarProcessoUseCase,
    private readonly listar: ListarProcessosUseCase,
    private readonly buscar: BuscarProcessoPorIdUseCase,
    private readonly excluir: ExcluirProcessoUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: ProcessoResponseDto })
  async create(@Body() dto: CriarProcessoDto, @Req() req: AuthRequest) {
    return this.criar.executar({ ...dto, autorId: req.user.id })
  }

  @Get()
  @ApiOkResponse({ type: ListaProcessosResponseDto })
  async findAll(@Query() query: ListarProcessosQuery) {
    return this.listar.executar(query)
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.buscar.executar(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    await this.excluir.executar({ id, autorId: req.user.id })
  }
}
```

---

## DTOs com class-validator

```typescript
// adapter/http/dto/criar-processo.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsUUID, Length } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CriarProcessoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  descricao: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsavelId?: string
}

// Response DTO — nunca retornar entidade ORM direto
export class ProcessoResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  descricao: string

  @ApiProperty()
  status: string

  @ApiProperty()
  criadoEm: Date

  @Exclude()  // ocultar campos internos — funciona com ClassSerializerInterceptor
  excluídoEm?: Date

  static fromDomain(processo: Processo): ProcessoResponseDto {
    return plainToInstance(ProcessoResponseDto, processo)
  }
}
```

---

## Exception Filter — shape consistente

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      return res.status(status).json({
        path:      req.url,
        timestamp: new Date().toISOString(),
        error:     typeof body === 'string' ? { message: body } : body,
      })
    }

    // Erro inesperado — logar e não vazar detalhes
    console.error('Erro não tratado:', exception)
    return res.status(500).json({
      path:      req.url,
      timestamp: new Date().toISOString(),
      error:     { message: 'Erro interno do servidor' },
    })
  }
}
```

---

## Configuração de ambiente com validação

```typescript
// config/configuration.ts
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV:     z.enum(['development', 'test', 'production']).default('development'),
  PORT:         z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET:   z.string().min(32),
  APP_NAME:     z.string().default('API'),
  APP_VERSION:  z.string().default('0.0.0'),
  BUILD_DATE:   z.string().optional(),
  GIT_COMMIT:   z.string().optional(),
  RUN_TESTS:    z.enum(['true', 'false']).default('false'),
})

export type Env = z.infer<typeof EnvSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${result.error.message}`)
  }
  return result.data
}
```

```typescript
// config/config.module.ts (global)
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
```

---

## Observabilidade: /healthz, /readyz, /metrics, /version

```typescript
// adapter/http/health.controller.ts
@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private config: ConfigService<Env>,
  ) {}

  @Get('healthz')
  @HealthCheck()
  liveness() {
    return { status: 'ok' }
  }

  @Get('readyz')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ])
  }

  @Get('version')
  version() {
    return {
      app:       this.config.get('APP_NAME'),
      backend:   this.config.get('APP_VERSION'),
      buildDate: this.config.get('BUILD_DATE') ?? null,
      commit:    this.config.get('GIT_COMMIT')  ?? null,
    }
  }
}
```

**Prometheus:** usar `@willsoto/nestjs-prometheus` — registra métricas HTTP
automaticamente via interceptor, sem instrumentar cada endpoint:

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

```typescript
// app.module.ts
PrometheusModule.register({
  defaultMetrics: { enabled: true },
  path: '/metrics',
})
```

---

## Auth JWT + port ABAC

```typescript
// domain/port/authorization-checker.port.ts
export interface AuthorizationChecker {
  podeExecutar(usuarioId: string, acao: string, recursoId?: string): Promise<boolean>
}

// Implementação NoOp (até dev-auth implementar ABAC real)
@Injectable()
export class NoOpAuthorizationChecker implements AuthorizationChecker {
  async podeExecutar(): Promise<boolean> { return true }
}

// Guard JWT padrão
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: Error, user: T): T {
    if (err || !user) throw err ?? new UnauthorizedException()
    return user
  }
}
```

---

## Testes

**Unitário (use case isolado):**
```typescript
describe('CriarProcessoUseCase', () => {
  let useCase: CriarProcessoUseCase
  let repo: jest.Mocked<ProcessoRepository>

  beforeEach(() => {
    repo = { criar: jest.fn(), buscarPorId: jest.fn() } as any
    useCase = new CriarProcessoUseCase(repo)
  })

  it('deve criar processo', async () => {
    repo.criar.mockResolvedValue({ id: 'uuid', descricao: 'Teste' } as Processo)
    const result = await useCase.executar({ descricao: 'Teste', autorId: 'user-id' })
    expect(result.descricao).toBe('Teste')
  })
})
```

**Integração (NestApplication real):**
```typescript
describe('ProcessoController (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(() => app.close())

  it('POST /api/v1/processos → 201', async () => {
    return request(app.getHttpServer())
      .post('/api/v1/processos')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Processo de teste' })
      .expect(201)
  })
})
```

**RUN_TESTS:** ver regra em `CLAUDE.md` — usar `DATABASE_URL_TEST` para banco isolado.

---

## Paginação e ordenação

```typescript
// adapter/http/dto/listar-processos.query.ts
export class ListarProcessosQuery {
  @IsOptional() @IsString() status?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite: number = 20
  @IsOptional() @IsIn(['criadoEm', 'descricao', 'status']) ordenar: string = 'criadoEm'
  @IsOptional() @IsIn(['asc', 'desc']) direcao: 'asc' | 'desc' = 'desc'
}
```

---

## Dois Dockerfiles por serviço

```dockerfile
# Dockerfile.dev (hot-reload com ts-node/nodemon)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# Dockerfile (produção — build TypeScript)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
```

---

## Checklist

- [ ] Estrutura hexagonal: domain/ adapter/ common/ config/
- [ ] `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`
- [ ] DTOs de request E response (nunca retornar entidade ORM direta)
- [ ] `HttpExceptionFilter` global com shape consistente
- [ ] Config validada via Zod/Joi no bootstrap
- [ ] `/healthz`, `/readyz`, `/version` implementados
- [ ] Prometheus via `PrometheusModule.register()`
- [ ] Ports de auth (`AuthorizationChecker`) com NoOp inicial
- [ ] Testes unitários com jest.Mocked, integração com INestApplication
- [ ] `RUN_TESTS` e `DATABASE_URL_TEST` (ver `CLAUDE.md`)
- [ ] Dois Dockerfiles (dev + prod)
- [ ] OpenAPI via `@nestjs/swagger` — exportar para `docs/openapi.yaml`
