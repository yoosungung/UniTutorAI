# Cloudflare deploy (UniTutor)

Workers(`backend/`) + Pages(`frontend/dist/`). D1/R2/KV는 아직 제품 경로에 묶지 않는다 — 바인딩을 추가할 때 이 문서를 함께 갱신한다.

Wiki: apply → deploy 순서 — `Cloudflare-D1-Migrations-Before-Worker-Deploy` (D1을 쓸 때만).

## Prerequisites

- Cloudflare account
- `npx wrangler login` (로컬) 또는 GitHub Actions secrets (아래)
- Pages 프로젝트 이름(기본): `unitutor`
- Worker 이름: `unitutor-backend` (`backend/wrangler.jsonc` `name`)

## Secrets / tokens (원격 배포 전)

| 이름 | 어디에 | 용도 |
|------|--------|------|
| `CLOUDFLARE_API_TOKEN` | GitHub Actions Secrets · 로컬 env | Workers 편집 (+ 나중에 D1 Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions Secrets · 로컬 env | 계정 ID |
| `GEMINI_API_KEY` | `wrangler secret put` (Worker) · `.dev.vars`(로컬) | 튜터 추론 (아직 라우트 최소) |
| `VITE_API_BASE_URL` | Pages 빌드 env / `.env` / CI | FE → Worker origin (끝 `/` 없이). 예: `https://unitutor-backend.<account>.workers.dev` |

토큰·계정이 없으면 **원격 push를 하지 말고** 티켓에 blocker만 남긴다.

## Local dry-run (토큰 없이 검증 가능)

```bash
# Workers 번들/설정 검증 (--config 로 상위 monorepo .wrangler redirect 회피)
cd backend && npm install && npm test && npm run deploy:dry-run

# Pages 정적 빌드 + pages deploy dry-run
cd frontend && npm install && npm test && npm run deploy:pages:dry-run
```

`deploy` / `deploy:dry-run` / Pages 스크립트는 `./wrangler.jsonc`를 명시한다(상위 monorepo `.wrangler/deploy` redirect 회피). Workers `deploy:dry-run`은 업로드 없이 번들 검증. Pages는 wrangler v3에 `--dry-run`이 없어 `deploy:pages:dry-run` = `npm run build`.

## Deploy sequence (원격)

### 1) Workers

```bash
cd backend
# (D1 바인딩이 생기면 먼저) npx wrangler d1 migrations apply <BINDING> --remote
npm run deploy
```

현재 `wrangler.jsonc`에 D1이 없으므로 apply 단계는 **N/A**. D1을 추가하면 `npm run deploy`가 **apply 성공 후** `wrangler deploy`만 호출하도록 스크립트를 바꾸고, CI에도 같은 순서를 넣는다.

### 2) Pages

```bash
cd frontend
# 빌드 시 API origin
export VITE_API_BASE_URL=https://unitutor-backend.<account>.workers.dev
npm run deploy:pages
```

또는 Cloudflare 대시보드에서 Pages 프로젝트 `unitutor`를 만들고 빌드 명령 `npm run build`, 출력 `dist`, 루트 `frontend/`.

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): backend test + `deploy:dry-run`, frontend test + build(+ pages dry-run).  
원격 `deploy` 워크플로는 토큰이 준비되면 별도 추가한다(빈 stub 금지).

## Verify (원격 배포 후)

```bash
curl -sS "$WORKER_URL/health"
# 브라우저: Pages URL에서 캔버스 로드 · Network에서 API base 확인
```
