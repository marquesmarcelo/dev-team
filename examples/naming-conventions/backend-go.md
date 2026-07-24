# Convenções de nomenclatura: Backend Go

> Pesquisado contra Effective Go, Go Style Decisions (Google) e práticas
> idiomáticas atuais — não convenção emprestada de outra linguagem.

## Regra geral
- **PascalCase** para identificadores exportados (visíveis fora do pacote):
  `type Processo struct`, `func NewProcesso(...)`.
- **camelCase** para identificadores não-exportados: `func validarCPF(...)`.
- Nunca usar `snake_case`, `Pascal_Snake_Case`, `SCREAMING_SNAKE_CASE` ou
  `ALLUPPERCASE` para identificadores — isso vale até para constantes
  (diferente de outras linguagens onde `MAX_RETRIES` é comum; em Go o
  idiomático é `MaxRetries` se exportado, `maxRetries` se não).

## ❌ Não usar: prefixo `I` em interface
Exemplos do que EVITAR: `IUserRepository`, `IProcessoService`.

Por quê: essa é convenção de C#/Java, não de Go. A comunidade Go nomeia
interface pelo comportamento que ela representa, frequentemente com
sufixo `-er` quando a interface tem um método principal (`Reader`,
`Writer`, `Validator`), ou apenas pelo nome do conceito quando não há
verbo natural (`Repository`, `Cache`).

## ✅ Usar
```go
type ProcessoRepository interface {
    BuscarPorID(ctx context.Context, id uuid.UUID) (*Processo, error)
    Salvar(ctx context.Context, p *Processo) error
}
```

## Siglas: case consistente, nunca capitalizado parcial
Exemplos do que EVITAR: `ApiKey`, `UserId`, `HttpClient`.

✅ Usar: `APIKey` (exportado) / `apiKey` (não-exportado), `UserID`/`userID`,
`HTTPClient`/`httpClient`. A sigla é tratada como uma palavra única, com
case consistente em todas as letras.

## Pacotes
- Nome curto, minúsculo, sem underscore, sem "stutter" (não crie um pacote
  `usuario` com um tipo `usuario.UsuarioRepository` — o correto é
  `usuario.Repository`, já que o nome do pacote já dá o contexto).

## Receivers de método
- Nome curto (1-2 letras ou abreviação do tipo), consistente em todos os
  métodos do mesmo tipo: `func (p *Processo) Validar() bool`. Nunca use
  `self` ou `this`.

## Arquivos
- `snake_case` minúsculo é aceitável para nome de arquivo (diferente da
  regra de identificador): `processo_repository.go`,
  `criar_processo_test.go`.

## Construtores
- `New<Tipo>` quando o pacote exporta múltiplos tipos: `NewProcesso(...)`.
- Apenas `New` quando o tipo é o único exportado relevante do pacote e o
  nome do pacote já dá contexto (ex: `processo.New(...)`).

## Getters/Setters
- Não prefixar getter com `Get` — `func (p *Processo) Descricao() string`,
  não `func (p *Processo) GetDescricao() string`. Setter, quando
  necessário, usa `Set`: `func (p *Processo) SetDescricao(d string)`.

## Exemplo completo
```go
package processo

type Status string

const (
    StatusAberto    Status = "aberto"
    StatusConcluido Status = "concluido"
)

type Processo struct {
    ID            uuid.UUID
    Descricao     string
    ResponsavelID uuid.UUID
    Status        Status
}

func New(descricao string, responsavelID uuid.UUID) *Processo {
    return &Processo{
        ID:            uuid.Must(uuid.NewV7()),
        Descricao:     descricao,
        ResponsavelID: responsavelID,
        Status:        StatusAberto,
    }
}

func (p *Processo) Concluir() error {
    if p.Status == StatusConcluido {
        return ErrProcessoJaConcluido
    }
    p.Status = StatusConcluido
    return nil
}
```
