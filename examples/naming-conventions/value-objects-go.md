# Exemplos de Value Objects em Go

> Referência para `dev-backend` e `arquiteto`. Estes padrões aplicam-se a
> qualquer atributo com validação, formato próprio, ou semântica de domínio.

## Estrutura de pastas

```
/internal/domain/
  /entity/
    processo.go
  /valueobject/       # (ou /vo — abreviação comum em Go)
    email.go
    cpf.go
    dinheiro.go
    periodo.go
    status_processo.go
```

## Padrão base (campos não-exportados + construtor que valida)

```go
// email.go
package valueobject

import (
    "encoding/json"
    "fmt"
    "net/mail"
    "strings"
)

type Email struct {
    valor string // não-exportado: ninguém muta diretamente
}

func NewEmail(s string) (Email, error) {
    s = strings.ToLower(strings.TrimSpace(s))
    if _, err := mail.ParseAddress(s); err != nil {
        return Email{}, fmt.Errorf("email inválido: %q", s)
    }
    return Email{valor: s}, nil
}

// MustEmail — use apenas em testes e fixtures, nunca em código de produção
func MustEmail(s string) Email {
    e, err := NewEmail(s)
    if err != nil { panic(err) }
    return e
}

func (e Email) String() string              { return e.valor }
func (e Email) Equals(other Email) bool     { return e.valor == other.valor }
func (e Email) IsZero() bool                { return e.valor == "" }
func (e Email) MarshalJSON() ([]byte, error) { return json.Marshal(e.valor) }
func (e *Email) UnmarshalJSON(data []byte) error {
    var s string
    if err := json.Unmarshal(data, &s); err != nil { return err }
    v, err := NewEmail(s)
    if err != nil { return err }
    *e = v
    return nil
}
```

## Value Object com operações de negócio (Dinheiro)

```go
// dinheiro.go
package valueobject

import "fmt"

type Moeda string
const (
    BRL Moeda = "BRL"
    USD Moeda = "USD"
)

// Dinheiro armazena centavos (int64) para evitar imprecisão de float.
type Dinheiro struct {
    centavos int64
    moeda    Moeda
}

func NewDinheiro(centavos int64, moeda Moeda) (Dinheiro, error) {
    if centavos < 0 {
        return Dinheiro{}, fmt.Errorf("valor monetário não pode ser negativo")
    }
    if moeda == "" {
        return Dinheiro{}, fmt.Errorf("moeda é obrigatória")
    }
    return Dinheiro{centavos: centavos, moeda: moeda}, nil
}

func (d Dinheiro) Centavos() int64  { return d.centavos }
func (d Dinheiro) Moeda() Moeda     { return d.moeda }
func (d Dinheiro) Equals(o Dinheiro) bool {
    return d.centavos == o.centavos && d.moeda == o.moeda
}

// Soma — imutável: retorna novo Dinheiro, nunca muta d nem o
func (d Dinheiro) Soma(o Dinheiro) (Dinheiro, error) {
    if d.moeda != o.moeda {
        return Dinheiro{}, fmt.Errorf("moedas incompatíveis: %s e %s", d.moeda, o.moeda)
    }
    return Dinheiro{centavos: d.centavos + o.centavos, moeda: d.moeda}, nil
}
```

## Status com transições válidas (State Machine no domínio)

```go
// status_processo.go
package valueobject

import "fmt"

type StatusProcesso string

const (
    StatusAberto     StatusProcesso = "aberto"
    StatusEmAnalise  StatusProcesso = "em_analise"
    StatusConcluido  StatusProcesso = "concluido"
    StatusCancelado  StatusProcesso = "cancelado"
)

// transicoesValidas — as únicas transições de estado permitidas pelo domínio
var transicoesValidas = map[StatusProcesso][]StatusProcesso{
    StatusAberto:    {StatusEmAnalise, StatusCancelado},
    StatusEmAnalise: {StatusConcluido, StatusCancelado},
    StatusConcluido: {},     // estado final
    StatusCancelado: {},     // estado final
}

func ParseStatusProcesso(s string) (StatusProcesso, error) {
    st := StatusProcesso(s)
    if _, ok := transicoesValidas[st]; !ok {
        return "", fmt.Errorf("status inválido: %q", s)
    }
    return st, nil
}

// PodeTransicionarPara — expõe a regra de transição como comportamento do VO
func (s StatusProcesso) PodeTransicionarPara(proximo StatusProcesso) bool {
    for _, v := range transicoesValidas[s] {
        if v == proximo { return true }
    }
    return false
}

func (s StatusProcesso) TransicionarPara(proximo StatusProcesso) (StatusProcesso, error) {
    if !s.PodeTransicionarPara(proximo) {
        return "", fmt.Errorf("transição inválida: %s → %s", s, proximo)
    }
    return proximo, nil
}
```

## Como a entidade usa Value Objects

```go
// /internal/domain/entity/processo.go
package entity

type Processo struct {
    ID            uuid.UUID                      // UUIDv7
    Descricao     string
    ResponsavelID uuid.UUID
    Email         valueobject.Email              // Value Object
    Status        valueobject.StatusProcesso     // Value Object com transições
    CriadoEm      time.Time
    AtualizadoEm  *time.Time
    ExcluidoEm    *time.Time                     // deleção lógica
}

// Concluir — comportamento da entidade usa o VO para validar transição
func (p *Processo) Concluir() error {
    novoStatus, err := p.Status.TransicionarPara(valueobject.StatusConcluido)
    if err != nil {
        return err // erro de domínio, não de infraestrutura
    }
    agora := time.Now()
    p.Status = novoStatus
    p.AtualizadoEm = &agora
    return nil
}
```

## Como o handler converte primitivo → Value Object

```go
// adapter/http — handler Gin
func (h *ProcessoHandler) Criar(c *gin.Context) {
    var req CriarProcessoRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": gin.H{"code": "REQUEST_INVALIDO", "message": err.Error()}})
        return
    }
    // Conversão imediata → qualquer erro é 400 antes de chamar o use case
    email, err := valueobject.NewEmail(req.Email)
    if err != nil {
        c.JSON(400, gin.H{"error": gin.H{"code": "EMAIL_INVALIDO", "message": err.Error()}})
        return
    }
    // Use case recebe tipo rico, nunca string bruta
    result, err := h.useCase.Execute(c.Request.Context(), command.CriarProcessoInput{
        Descricao:     req.Descricao,
        Email:         email,
        ResponsavelID: req.ResponsavelID,
    })
    // ...
}
```
