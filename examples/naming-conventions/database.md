# Convenções de nomenclatura: Banco de dados (PostgreSQL)

> Pesquisado e validado contra o consenso atual da comunidade (2026), não
> apenas preferência pessoal. Onde havia uma prática antiga mais comum
> (notação húngara: `TB_`, `NU_`, `VC_`), ela é citada e explicitamente
> descartada, com a justificativa.

## Regra geral
- `snake_case`, tudo em letras minúsculas — tabelas, colunas, índices,
  constraints, views, funções.
- Nunca misturar case (não usar `snake_case` em uma tabela e
  `camelCase`/`PascalCase` em outra).
- Nunca usar palavra reservada do SQL como nome (`order`, `user`, `table`).
- Nunca usar espaço, hífen, ou caractere especial — só letras, números e
  underscore.

## ❌ Não usar: prefixo de tipo (notação húngara)
Exemplos do que EVITAR: `TB_processo`, `NU_quantidade`, `VC_descricao`,
`DT_criacao`.

Por quê: esse estilo era comum em ambientes Oracle/SQL Server mais
antigos (e ainda ensinado em alguns cursos no Brasil), mas o consenso
moderno é contra. O nome do tipo de dado já está na definição da coluna —
repeti-lo no nome é redundante e quebra se o tipo mudar (uma coluna
`NU_telefone` que precisa aceitar `+55 (61) 99999-9999` deixa de ser
numérica, mas o nome mente).

## ✅ Usar: nome descritivo, sem prefixo de tipo
- Tabela: `processo`, `usuario`, `lote_terreno` (singular — ver seção abaixo)
- Coluna: `quantidade`, `descricao`, `data_criacao`, `telefone`

## Singular ou plural no nome da tabela?
Escolha **singular** como padrão deste template (`processo`, não
`processos`) — sustenta clareza ao referenciar uma linha individual em
código e em joins. O importante, qualquer que seja a escolha, é aplicar a
mesma regra em 100% das tabelas do projeto — nunca misturar.

## Chave primária
- Sempre `id` — sem prefixo do nome da tabela (`processo.id`, não
  `processo.processo_id`). É curto, inequívoco, e qualquer SQL com join
  fica mais legível.
- Tipo: `UUID` (UUIDv7, gerado na aplicação — ver regra de identificadores
  no `CLAUDE.md`), nunca `SERIAL`/`BIGSERIAL`.

## Chave estrangeira
- `<tabela_referenciada>_id` — ex: `processo.responsavel_id` referenciando
  `usuario.id`.
- Se houver duas FKs para a mesma tabela na mesma linha (ex: `criado_por`
  e `aprovado_por`, ambos apontando para `usuario`), use um qualificador
  descritivo: `criado_por_id`, `aprovado_por_id` — não `usuario_id_1`,
  `usuario_id_2`.

## Índices e constraints
- Índice: `idx_<tabela>_<coluna(s)>` — ex: `idx_processo_responsavel_id`
- Constraint única: `uq_<tabela>_<coluna(s)>`
- Foreign key constraint: `fk_<tabela>_<tabela_referenciada>`

## Tabelas de junção (many-to-many)
- Nome combinando as duas tabelas no singular: `processo_usuario` (para
  relacionar `processo` e `usuario`).

## Booleanos
- Prefixo `is_`/`tem_`/`possui_` para deixar claro que é booleano:
  `is_ativo`, `tem_pendencia`.

## Datas e timestamps
- Sufixo `_em` para timestamp de evento: `criado_em`, `atualizado_em`,
  `excluido_em` (soft delete).
- Nunca misturar formato de data dentro do mesmo projeto.

## Campos base obrigatórios (toda entidade, sem exceção)
- `id` — UUID, gerado na aplicação
- `criado_em` — `TIMESTAMPTZ NOT NULL DEFAULT now()`
- `atualizado_em` — `TIMESTAMPTZ`, atualizado pelo use case de comando
- `excluido_em` — `TIMESTAMPTZ`, nulo enquanto ativo (deleção lógica —
  nunca `DELETE` real; ver `CLAUDE.md`)

## Exemplo completo
```sql
CREATE TABLE processo (
  id UUID PRIMARY KEY,
  numero_protocolo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  responsavel_id UUID NOT NULL REFERENCES usuario(id),
  is_ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ,
  excluido_em TIMESTAMPTZ
);

CREATE INDEX idx_processo_responsavel_id ON processo(responsavel_id);

-- Índice único parcial: respeita deleção lógica (não bloqueia reuso de
-- numero_protocolo de um registro já excluído)
CREATE UNIQUE INDEX uq_processo_numero_protocolo
  ON processo(numero_protocolo) WHERE excluido_em IS NULL;
```
