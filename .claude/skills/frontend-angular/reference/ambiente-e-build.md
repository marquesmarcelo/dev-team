# Angular — Ambiente e build

> Referência da skill `frontend-angular`. Carregar sob demanda.

## APP_ENV — configuração por ambiente

> Regra universal em `CLAUDE.md`. Implementar via `environment.ts` e
> middleware de headers no servidor (Nginx ou backend).

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  appEnv: 'development' as 'development' | 'production',
  appName: 'Nome do Sistema',
  appVersion: 'dev',
  buildDate: '',
  gitCommit: '',
}

// environments/environment.prod.ts
export const environment = {
  production: true,
  appEnv: 'production' as 'development' | 'production',
  appName: 'Nome do Sistema',
  appVersion: '${APP_VERSION}',   // substituído pelo CI
  buildDate: '${BUILD_DATE}',
  gitCommit: '${GIT_COMMIT}',
}
```

```typescript
// core/guards/env-guard.ts — bloqueio best-effort de DevTools em prod
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'

@Injectable({ providedIn: 'root' })
export class EnvGuardService {
  init(): void {
    if (environment.appEnv !== 'production') return

    // Best-effort: não é inviolável — valor real está no CSP e ausência de source maps
    setInterval(() => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      if (performance.now() - start > 100) {
        document.body.innerHTML = ''
      }
    }, 1000)
  }
}
```

**Headers de segurança em produção** — configurar no Nginx ou no backend
que serve o Angular (não no Angular em si, que é SPA estática):

```nginx
# nginx.conf — bloco location para a aplicação Angular
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

```bash
# .env.example
APP_ENV=development   # backend lê e passa para o build do Angular via CI
```

**Build do Angular:**
```bash
# Desenvolvimento (HMR ativo, source maps, sem CSP)
ng serve

# Produção (sem source maps, otimizado)
ng build --configuration=production
```

## Autenticação — regra de segurança obrigatória

**JWT nunca vai para `localStorage` ou `sessionStorage`.**
O token é armazenado em cookie `HttpOnly` pelo backend. O Angular
não gerencia o token — o browser envia o cookie automaticamente.

```typescript
// ❌ PROIBIDO — vulnerável a XSS
localStorage.setItem('auth_token', jwt)
headers.set('Authorization', `Bearer ${localStorage.getItem('auth_token')}`)

// ✅ CORRETO — withCredentials em toda requisição autenticada
// O HttpClient envia o cookie HttpOnly automaticamente.

// app.config.ts — setar withCredentials globalmente
provideHttpClient(
  withInterceptors([loadingProgressInterceptor]),
  withCredentials()   // ← todas as requisições incluem cookies
)

// Ou por interceptor, se só parte das requisições for autenticada:
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }))
}

// AuthService — login: backend seta o cookie, Angular não toca no token
login(email: string, senha: string): Observable<void> {
  return this.http.post<void>('/api/auth/login', { email, senha })
  // cookie HttpOnly setado automaticamente pelo browser na resposta
}

// Logout: backend apaga o cookie
logout(): Observable<void> {
  return this.http.post<void>('/api/auth/logout', {})
}
```

## Dois Dockerfiles

- `Dockerfile` — produção: `node:20-alpine` builder + `nginx:alpine` runner
  servindo os arquivos estáticos do `dist/`.
- `Dockerfile.dev` — dev: `node:20-alpine`, monta volume, `CMD ng serve
  --host 0.0.0.0 --poll 500` (poll para hot-reload dentro de container).

## Lazy loading por feature

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'processos',
    loadChildren: () =>
      import('./features/processo/processo.routes').then(m => m.PROCESSO_ROUTES),
  },
];
```
