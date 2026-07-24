# Exemplo de estrutura de pastas: Backend Java + Spring Boot + Hexagonal

```
backend/
  src/
    main/java/com/projeto/
      processo/                       # bounded context
        domain/
          entity/
            Processo.java             # Rich domain model
          valueobject/
            Email.java                # record com validação no construtor compacto
            CPF.java
            StatusProcesso.java       # enum com transições
          event/
            ProcessoCriado.java
        usecase/
          command/
            CriarProcessoUseCase.java
          query/
            ListarProcessosUseCase.java
        port/
          in/
            CriarProcessoPort.java    # interface de entrada
            ListarProcessosPort.java
          out/
            ProcessoRepository.java   # interface de saída
            CachePort.java
        adapter/
          in/
            http/
              ProcessoController.java  # @RestController delgado
              dto/
                CriarProcessoRequest.java
                ProcessoResponse.java
          out/
            persistence/
              ProcessoJpaEntity.java   # @Entity — separado do domain
              ProcessoJpaRepository.java
              ProcessoQueryRepository.java # @Query customizado
              mapper/
                ProcessoMapper.java    # MapStruct
            redis/
              CacheAdapter.java
    test/java/com/projeto/
      processo/
        usecase/
          CriarProcessoUseCaseTest.java  # JUnit 5 + Mockito
        arch/
          ProcessoArchTest.java           # ArchUnit
        controller/
          ProcessoControllerTest.java     # @WebMvcTest
  pom.xml                                 # ou build.gradle
  Dockerfile
  Dockerfile.dev
```

Regra verificada pelo ArchUnit: nenhuma classe de `domain` ou `usecase`
depende de classes de `adapter`. O teste é automático e falha o build.
