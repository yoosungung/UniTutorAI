# UniTutor Frontend

React와 Vite 기반의 UniTutor 적응형 웹 클라이언트다.

제품 경험은 [../docs/PRODUCT.md](../docs/PRODUCT.md), 불변 계약과 스키마는 [../ARCHITECTURE.md](../ARCHITECTURE.md), 내부 컴포넌트 설계는 [DESIGN.md](DESIGN.md)를 참고한다.

## Quickstart

### 1. 의존성 설치
```bash
npm install
```

### 2. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173`으로 접속한다.

### 3. API base (Pages → Workers)
`.env.example`을 복사해 `VITE_API_BASE_URL`에 Worker origin을 넣는다(비우면 상대 경로). 사용처: `src/lib/apiBase.ts`.

### 4. 프로덕션 빌드 / Pages
```bash
npm run build
npm run deploy:pages:dry-run   # 업로드 없음
npm run deploy:pages           # Cloudflare Pages (project: unitutor)
```
상세·시크릿: [../deploy/SETUP.md](../deploy/SETUP.md).

### 5. 테스트 실행
```bash
npm test
```