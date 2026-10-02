# Cloudflare deploy (UniTutor)

프로덕션 호스트:
- **Pages (SPA):** `https://tutor.askwho.net`
- **Worker (API):** `https://api.tutor.askwho.net`

Workers(`backend/`) + Pages(`frontend/dist/`). D1/R2/KV는 아직 제품 경로에 묶지 않는다 — 바인딩을 추가할 때 이 문서를 함께 갱신한다.

Wiki: apply → deploy 순서 — `Cloudflare-D1-Migrations-Before-Worker-Deploy` (D1을 쓸 때만).  
참고(존/커스텀 도메인 패턴): factory `deploy/SETUP.md` · Cloudflare Custom Domains.

## Prerequisites

- Cloudflare account (권장: **`askwho.net` 존이 같은 계정에 Active**)
- `npx wrangler login` (로컬) 또는 GitHub Actions secrets (아래)
- Pages 프로젝트 이름(기본): `unitutor`
- Worker 이름: `unitutor-backend` (`backend/wrangler.jsonc` `name`)
- `tutor.askwho.net` / `api.tutor.askwho.net`에 **기존 CNAME/A/AAAA가 있으면 제거** (Custom Domain이 DNS·인증서를 직접 만듦). MX/TXT는 유지.

## Secrets / tokens (원격 배포 전)

| 이름 | 어디에 | 용도 |
|------|--------|------|
| `CLOUDFLARE_API_TOKEN` | GitHub Actions Secrets · 로컬 env | Workers 편집 (+ 나중에 D1 Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions Secrets · 로컬 env | 계정 ID |
| `GEMINI_API_KEY` | `wrangler secret put` (Worker) · `.dev.vars`(로컬) | 튜터 추론 (아직 라우트 최소) |
| `VITE_API_BASE_URL` | Pages 빌드 env / `.env` / CI | FE → Worker origin (끝 `/` 없이). 프로덕션: `https://api.tutor.askwho.net` |

토큰·계정이 없으면 **원격 push를 하지 말고** 티켓에 blocker만 남긴다.

## Local dry-run (토큰 없이 검증 가능)

```bash
# Workers 번들/설정 검증 (--config 로 상위 monorepo .wrangler redirect 회피)
cd backend && npm install && npm test && npm run deploy:dry-run

# Pages 정적 빌드 + pages deploy dry-run
cd frontend && npm install && npm test && npm run deploy:pages:dry-run
```

Workers `deploy` / `deploy:dry-run`은 `--config ./wrangler.jsonc`로 상위 monorepo `.wrangler` redirect를 피한다. Pages는 wrangler가 `--config` 커스텀 경로를 거부하므로 cwd의 `wrangler.jsonc` 자동 탐색만 쓴다(`deploy:pages`). Pages `deploy:pages:dry-run` = `npm run build`(v3에 pages `--dry-run` 없음).

## Deploy sequence (원격)

### 1) Workers

```bash
cd backend
# (D1 바인딩이 생기면 먼저) npx wrangler d1 migrations apply <BINDING> --remote
npm run deploy
```

현재 `wrangler.jsonc`에 D1이 없으므로 apply 단계는 **N/A**. D1을 추가하면 `npm run deploy`가 **apply 성공 후** `wrangler deploy`만 호출하도록 스크립트를 바꾸고, CI에도 같은 순서를 넣는다.

`backend/wrangler.jsonc`의 `routes` (`api.tutor.askwho.net`, `custom_domain: true`)는 배포 시 Worker Custom Domain을 재확인한다.

### 2) Pages

```bash
cd frontend
export VITE_API_BASE_URL=https://api.tutor.askwho.net
npm run deploy:pages
```

또는 Cloudflare 대시보드에서 Pages 프로젝트 `unitutor`를 만들고 빌드 명령 `npm run build`, 출력 `dist`, 루트 `frontend/`.  
Pages 빌드 env에 `VITE_API_BASE_URL=https://api.tutor.askwho.net`을 넣는다.

## Custom Domain

`askwho.net`이 같은 Cloudflare 계정 존이어야 한다. 아래는 **원격 토큰 준비 후** 1회.

### A. Worker — `api.tutor.askwho.net`

`wrangler.jsonc`에 이미:

```jsonc
"routes": [
  {
    "pattern": "api.tutor.askwho.net",
    "custom_domain": true
  }
]
```

`npm run deploy`(backend)로 적용. Dashboard 대안: Worker `unitutor-backend` → Settings → Domains & Routes → Custom Domain → `api.tutor.askwho.net`.

에러 `Hostname already has externally managed DNS records` → DNS에서 해당 호스트 CNAME/A/AAAA만 삭제 후 재시도.

### B. Pages — `tutor.askwho.net`

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → Pages `unitutor`
2. **Custom domains** → Set up a custom domain → `tutor.askwho.net`
3. 존이 Cloudflare면 DNS/TLS가 자동 생성될 때까지 대기

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): backend test + `deploy:dry-run`, frontend test + build(+ pages dry-run).

### Remote deploy (GitHub Actions)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — sw-factory `deploy.yml` 패턴:

- `on:` `push` `main` + `workflow_dispatch`
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (repo Actions secrets)
- 순서: Worker `npm run deploy` → Pages `deploy:pages` (`VITE_API_BASE_URL=https://api.tutor.askwho.net`)
- D1 `migrations apply`: **N/A** (바인딩 없음; 생기면 apply → deploy로 확장)
- Smoke: `https://api.tutor.askwho.net/health` + `https://tutor.askwho.net/`

```bash
# 수동 재배포
gh workflow run deploy.yml --repo yoosungung/UniTutorAI
```

시크릿이 없으면 워크플로는 실패한다 — 파일은 merge해 두고 `prod:` 증거는 시크릿 준비 후로 미룬다.

## Verify (원격 배포 후)

```bash
curl -sS https://api.tutor.askwho.net/health
# 브라우저: https://tutor.askwho.net 캔버스 로드 · Network에서 API base = api.tutor.askwho.net 확인
```
