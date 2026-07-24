# Evidence: <nome-da-feature>

> Preenchido ao final da implementação. Fecha o ciclo: prova que o que foi
> especificado é o que foi construído.

## Testes executados

| Cenário (de spec.md) | Tipo de teste | Resultado | Arquivo do teste |
|---|---|---|---|
| <nome do cenário 1> | unitário (use case) | ✅/❌ | `<path>` |
| <nome do cenário 2> | integração (handler) | ✅/❌ | `<path>` |

## Cobertura
- Use case `<nome>`: <%>
- Comando usado: <ex: `go test ./... -cover`, conforme skill da stack>

## Validação manual (quando aplicável)
- <passo manual feito> → <resultado observado>

## Conformidade com design.md
- [ ] Contrato de API implementado exatamente como especificado
- [ ] Nenhuma dependência de `/adapter` entrou em `/domain` ou `/usecase`
- [ ] Revisão de segurança concluída (se aplicável) — ver achados abaixo

## Achados da revisão de segurança (se houve)
- <achado 1> → <ação tomada>

## Achados de qualidade de código (se houve)
- <achado 1 do code-reviewer> → <ação tomada>

## Teste de carga (se aplicável)
- Limite definido em spec.md: <ex: p95 < 300ms, 100 req/s>
- Resultado real: <p50/p95/p99, taxa de erro, throughput atingido>
- [ ] Limite atingido
- [ ] Limite não atingido — decisão: <otimizar / ajustar infraestrutura / revisar limite>

## Desvios em relação à spec original
- <se algo mudou durante a implementação, registrar aqui e atualizar spec.md/design.md>

## Status final
- [ ] Pronto para merge
- [ ] Pendências: <listar>
