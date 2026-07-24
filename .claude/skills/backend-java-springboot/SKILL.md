---
name: backend-java-springboot
description: Use ao implementar backend em Java com Spring Boot, quando project.config.md indicar esta stack. Cobre estrutura hexagonal em Java, interfaces como ports, injeção de dependência via Spring IoC, value objects com records, ArchUnit para validar limites arquiteturais.
---

# Backend: Java + Spring Boot + Hexagonal

## Estrutura de pastas (por bounded context)

```
src/main/java/com/projeto/
  processo/                     # bounded context
    domain/
      entity/
        Processo.java           # Rich domain model (não anêmico)
      valueobject/
        Email.java              # record imutável com validação
        CPF.java
        StatusProcesso.java     # enum com transições
      event/
        ProcessoCriado.java
    usecase/
      command/
          <entidade>/   # ex: processo/, usuario/
        CriarProcesso.java      # orquestra domínio
        CriarProcessoTest.java  # TDD
      query/
          <entidade>/   # ex: processo/, usuario/
        ListarProcessos.java
    port/
      in/
        CriarProcessoPort.java  # interface de entrada (use case)
      out/
        ProcessoRepository.java # interface de saída (persistência)
        CachePort.java
    adapter/
      in/
        http/
          ProcessoController.java   # @RestController — delgado
      out/
        persistence/
          ProcessoJpaRepository.java   # Spring Data JPA (queries simples)
          ProcessoQueryRepository.java # @Query customizado (queries complexas)
          mapper/
            ProcessoMapper.java       # MapStruct
```

Regra inegociável: `domain` e `usecase` NUNCA dependem de `adapter`.
Use **ArchUnit** em testes para validar isso automaticamente:

```java
// ProcessoArchTest.java
@AnalyzeClasses(packages = "com.projeto")
public class ProcessoArchTest {
    @ArchTest
    static ArchRule domainNaoDependeDeAdapter =
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..adapter..");
}
```

## Value Objects com Java Records (imutáveis por definição)

```java
// domain/valueobject/Email.java
public record Email(String valor) {
    public Email {
        Objects.requireNonNull(valor);
        valor = valor.trim().toLowerCase();
        if (!valor.matches("[^@]+@[^@]+\\.[^@]+")) {
            throw new IllegalArgumentException("Email inválido: " + valor);
        }
    }
}
```

Status com máquina de estados:

```java
// domain/valueobject/StatusProcesso.java
public enum StatusProcesso {
    ABERTO, EM_ANALISE, CONCLUIDO, CANCELADO;

    private static final Map<StatusProcesso, Set<StatusProcesso>> TRANSICOES = Map.of(
        ABERTO,     Set.of(EM_ANALISE, CANCELADO),
        EM_ANALISE, Set.of(CONCLUIDO, CANCELADO),
        CONCLUIDO,  Set.of(),
        CANCELADO,  Set.of()
    );

    public StatusProcesso transicionarPara(StatusProcesso proximo) {
        if (!TRANSICOES.get(this).contains(proximo)) {
            throw new DomainException("Transição inválida: " + this + " → " + proximo);
        }
        return proximo;
    }
}
```

## Injeção de dependência com Spring IoC

```java
// adapter/in/http/ProcessoController.java
@RestController
@RequestMapping("/api/v1/processos")
@RequiredArgsConstructor
public class ProcessoController {
    // Depende da interface (port), nunca da implementação
    private final CriarProcessoPort criarProcesso;
    private final ListarProcessosPort listarProcessos;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProcessoResponse criar(@RequestBody @Valid CriarProcessoRequest req) {
        // Controller delgado: converte request → comando → chama use case
        var email = new Email(req.email()); // conversão imediata para Value Object
        return ProcessoResponse.from(criarProcesso.executar(
            new CriarProcessoCommand(email, req.descricao())
        ));
    }
}
```

## Acesso a dados: Spring Data JPA + @Query customizado

Para CRUD simples: Spring Data JPA Repository.
Para queries complexas (relatórios, filtros, paginação):

```java
// adapter/out/persistence/ProcessoQueryRepository.java
@Repository
@RequiredArgsConstructor
public class ProcessoQueryRepository {
    private final EntityManager em;

    private static final Set<String> COLUNAS_ORDENAVEIS =
        Set.of("criadoEm", "descricao", "status");

    public Page<ProcessoListagem> listar(Pageable pageable, String sort, String order) {
        String coluna = COLUNAS_ORDENAVEIS.contains(sort) ? sort : "criadoEm";
        // JPQL com parâmetros — nunca concatenação de string de input
        return em.createQuery("""
            SELECT p FROM Processo p
            WHERE p.excluidoEm IS NULL
            ORDER BY p.""" + coluna + (order.equals("desc") ? " DESC" : " ASC"),
            ProcessoListagem.class
        ).setFirstResult(...).setMaxResults(...).getResultList();
    }
}
```

Allowlist obrigatória — nunca interpolar `sort` diretamente na query.

## CQRS-leve

- `usecase/command/` → alteram estado, disparam Domain Events
- `usecase/query/` → somente leitura, podem usar projeções diretas no banco

## OpenAPI / Swagger (Springdoc gera automaticamente)

Use **`springdoc-openapi-starter-webmvc-ui`** — gera Swagger UI e
`openapi.json` automaticamente a partir das anotações Spring MVC:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.x</version>
</dependency>
```

```yaml
# application.yml
springdoc:
  swagger-ui:
    path: /swagger
  api-docs:
    path: /openapi.json
```

Acesse a UI em desenvolvimento: `http://localhost:3001/swagger`

Anotações por endpoint (controller):
```java
@Operation(summary = "Criar processo", tags = "processos")
@ApiResponse(responseCode = "201", description = "Processo criado",
    content = @Content(schema = @Schema(implementation = ProcessoResponse.class)))
@ApiResponse(responseCode = "403", description = "Acesso negado")
@PostMapping
public ResponseEntity<ProcessoResponse> criar(@RequestBody @Valid CriarProcessoRequest req) { ... }
```

O `tech-writer` exporta `/openapi.json` para `docs/openapi.yaml` versionado:
```bash
docker compose run --rm backend ./mvnw springdoc-openapi:generate \
  -Dspringdoc.outputFileName=openapi.yaml \
  -Dspringdoc.outputDir=docs/
```

## Observabilidade: Prometheus + endpoints de saúde

**Spring Boot Actuator + Micrometer** — configuração mínima:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,readiness,liveness,prometheus
  endpoint:
    health:
      probes:
        enabled: true   # /actuator/health/liveness e /actuator/health/readiness
  metrics:
    distribution:
      percentiles-histogram:
        http.server.requests: true  # histograma para Prometheus
```

Endpoints automáticos:
- `/actuator/prometheus` → scrape do Prometheus
- `/actuator/health/liveness` → liveness probe Kubernetes
- `/actuator/health/readiness` → readiness probe Kubernetes (verifica DB, Redis)

**Não implementar `/metrics`, `/healthz`, `/readyz` manualmente** — o
Actuator já entrega o equivalente. O `devops` configura o `livenessProbe`
e `readinessProbe` do manifesto Kubernetes apontando para os endpoints do
Actuator.

## Endpoint /version (obrigatório desde o primeiro commit)

```java
// adapter/web/VersionController.java
@RestController
public class VersionController {

    @GetMapping("/version")
    public Map<String, String> version() {
        return Map.of(
            "app",       System.getenv("APP_NAME"),
            "backend",   System.getenv("APP_VERSION"),
            "frontend",  System.getenv("FRONTEND_VERSION"),
            "buildDate", System.getenv("BUILD_DATE"),
            "commit",    System.getenv("GIT_COMMIT")
        );
    }
}
```

## Testes

```bash
docker compose run --rm backend ./mvnw test
# ou
docker compose run --rm backend ./gradlew test
```

- Use cases: testes unitários com mocks (`Mockito`) dos ports de saída.
- Controllers: `@WebMvcTest` com `@MockBean` do use case.
- ArchUnit: `@ArchTest` para validar regras de dependência.

## DEV_SEM_AUTH e CORS

```yaml
# application.yml
app:
  dev-sem-auth: ${DEV_SEM_AUTH:false}
  cors-allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:4200}
```

```java
@ConditionalOnProperty(name = "app.dev-sem-auth", havingValue = "true")
@Component
public class DevAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(request, response, chain) {
        // Bypass: só ativo se DEV_SEM_AUTH=true
        SecurityContextHolder.getContext().setAuthentication(devAuthentication());
        chain.doFilter(request, response);
    }
}
```

## Dois Dockerfiles

- `Dockerfile` — produção: multi-stage (`maven:3.9-eclipse-temurin-21` builder
  + `eclipse-temurin:21-jre-alpine` runner).
- `Dockerfile.dev` — dev: `./mvnw spring-boot:run` com `spring-boot-devtools`
  ou `./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=..."`.
