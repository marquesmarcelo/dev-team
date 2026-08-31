# Next.js + shadcn/ui — Ambiente e build

> Referência da skill `frontend-nextjs-shadcn`. Carregar sob demanda.

## Qualidade e contratos de código (Biome, knip, dependency-cruiser)

> Regra universal em `CLAUDE.md`. Configurar na primeira entrega do projeto.
> Arquivos de exemplo em `examples/quality/`.

### Biome — lint + format (substitui ESLint + Prettier)

```bash
npm install --save-dev @biomejs/biome
cp examples/quality/biome.json .
```

```json
// package.json — scripts
{
  "scripts": {
    "lint":       "biome lint .",
    "format":     "biome format --write .",
    "check":      "biome check .",
    "ci:quality": "biome ci ."
  }
}
```

No CI: `npm run ci:quality` — falha com exit 1 se houver lint ou formatação incorreta.

### knip — detectar código morto

```bash
npm install --save-dev knip
cp examples/quality/knip.config.ts .
```

```json
// package.json
{ "scripts": { "knip": "knip" } }
```

### dependency-cruiser — contratos arquiteturais

```bash
npm install --save-dev dependency-cruiser
cp examples/quality/.dependency-cruiser.js .
```

```json
// package.json
{
  "scripts": {
    "arch:check":   "depcruise src --config .dependency-cruiser.js",
    "arch:diagram": "depcruise src --output-type dot | dot -T svg > architecture.svg"
  }
}
```

Valida em CI que `shared/` nunca importa de `features/`, que `features/`
não se importam diretamente entre si, e que não há dependências circulares.

### commitlint + husky — Conventional Commits

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
cp examples/quality/commitlint.config.js .
```

## Dois Dockerfiles por serviço
> Antes de criar ou atualizar qualquer Dockerfile, leia os exemplos em
> `examples/docker/frontend/` — são os arquivos de referência deste projeto.

- `Dockerfile` — produção: multi-stage, imagem final com apenas o output
  do `next build` (standalone + static). Ver
  `examples/docker/frontend/Dockerfile`.
- `Dockerfile.dev` — desenvolvimento: imagem Node completa, não copia
  código (vem do volume), roda `npm install && npm run dev` na
  inicialização. Ver `examples/docker/frontend/Dockerfile.dev`.

## .dockerignore (obrigatório, criado junto com o Dockerfile)
```
node_modules
.next
out
.env
.env.*
*.log
.git
```

## Comandos sempre via container
```bash
docker compose run --rm frontend npm install
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
```
Mesma regra do backend: se algo só funciona instalando na máquina do
desenvolvedor, o ambiente containerizado está incompleto.

## APP_ENV — configuração por ambiente (CSP prático para shadcn/ui)

> Regra universal em `CLAUDE.md`. A configuração abaixo é a que
> **realmente funciona** com Next.js + Tailwind + Radix/shadcn.

### Por que `style-src 'unsafe-inline'` é necessário e aceitável

Tailwind (via `@layer`), Radix UI e shadcn/ui injetam estilos inline em
runtime — é parte do funcionamento desses frameworks. Remover
`'unsafe-inline'` do `style-src` quebra a aplicação completamente.

**Isso é um tradeoff aceitável porque:**
- CSS injection tem vetor de ataque muito mais restrito que JS injection
- A proteção que importa é no `script-src` — bloquear JS malicioso
- O CSP abaixo usa **nonce** para scripts, que é a defesa real contra XSS

### Nonce por requisição — proteção real do script-src

Em vez de `'unsafe-inline'` em scripts (que anula a proteção), usar
nonce criptográfico gerado por request. O Next.js 14+ suporta isso
nativamente via middleware:

```typescript
// middleware.ts (raiz do projeto)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'

export function middleware(request: NextRequest) {
  const isProd = process.env.APP_ENV === 'production'

  if (!isProd) return NextResponse.next()

  // Nonce único por requisição — inviolável mesmo com XSS parcial
  const nonce = crypto.randomBytes(16).toString('base64')

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,   // nonce no lugar de 'unsafe-inline'
    "style-src 'self' 'unsafe-inline'",     // necessário: Tailwind + Radix injetam estilos em runtime
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Passar o nonce para o layout via header — Next.js lê no server component
  response.headers.set('x-nonce', nonce)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

```typescript
// app/layout.tsx — ler o nonce e passar para scripts inline
import { headers } from 'next/headers'

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html>
      <body>
        {children}
        {/* Scripts inline precisam do nonce — sem ele o CSP bloqueia */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: '' }} />
      </body>
    </html>
  )
}
```

```typescript
// next.config.ts — sem CSP aqui (middleware cuida)
const isProd = process.env.APP_ENV === 'production'

const nextConfig = {
  productionBrowserSourceMaps: false,  // source maps só em dev

  // Em dev: sem CSP — não quebrar HMR, DevTools e hot reload
  // Em prod: CSP via middleware (nonce por request)
  async headers() {
    if (isProd) return []  // middleware já seta os headers
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }]
  },
}
export default nextConfig
```

### O que o CSP bloqueia vs. o que aceita

```
✅ Bloqueia:     JS inline sem nonce (<script>código malicioso</script>)
✅ Bloqueia:     JS de domínio externo (cdn.atacante.com/xss.js)
✅ Bloqueia:     iframes de outros domínios (frame-ancestors 'none')
⚠️ Aceita:      CSS inline (Tailwind/Radix) — tradeoff consciente
✅ Mitiga CSS:  sem 'unsafe-eval' + headers X-Frame-Options + HSTS
```

```bash
# .env.example
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

```typescript
// components/providers/env-guard.tsx — bloqueio best-effort de DevTools em prod
'use client'
import { useEffect } from 'react'

export function EnvGuard() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') return

    // Best-effort: detectar DevTools abertos pelo delta de tempo
    // Não é inviolável — o valor real está nos outros controles de segurança
    const handler = () => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      if (performance.now() - start > 100) {
        document.body.innerHTML = ''
      }
    }
    const interval = setInterval(handler, 1000)
    return () => clearInterval(interval)
  }, [])

  return null
}
```

```bash
# .env.example
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development   # versão pública para o componente client-side
```

Em produção o CI injeta `APP_ENV=production` e `NEXT_PUBLIC_APP_ENV=production`.

## Autenticação — regra de segurança obrigatória

**JWT nunca vai para `localStorage` ou `sessionStorage`.**
O token é armazenado em cookie `HttpOnly` pelo backend — o frontend
não toca no token diretamente. O cookie é enviado automaticamente
pelo browser em cada requisição.

```typescript
// ❌ PROIBIDO — vulnerável a XSS
localStorage.setItem('token', jwt)
const token = localStorage.getItem('token')
headers: { Authorization: `Bearer ${token}` }

// ✅ CORRETO — cookie HttpOnly gerenciado pelo browser/servidor
// O frontend não faz nada com o token.
// O browser envia o cookie automaticamente.
// O backend lê o JWT do cookie, nunca do header Authorization.

// Login: só chama a API — o backend seta o cookie na resposta
await fetchWithProgress('/api/auth/login', {
  method: 'POST',
  credentials: 'include',   // ← obrigatório para enviar/receber cookies
  body: JSON.stringify({ email, senha }),
})

// Todas as requisições autenticadas: credentials: 'include'
await fetchWithProgress('/api/v1/processos', {
  credentials: 'include',   // ← cookie enviado automaticamente
})

// Logout: só chama a API — o backend apaga o cookie
await fetchWithProgress('/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
})
```

O `fetchWithProgress` deve sempre incluir `credentials: 'include'`
nas chamadas autenticadas. O interceptor HTTP automático pode setar
isso globalmente se toda a aplicação for autenticada.
