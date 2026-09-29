# UniTutor Backend

Cloudflare Workers와 Hono 기반의 UniTutor 엣지 백엔드 서비스다.

내부 설계 및 동작 원리는 [DESIGN.md](DESIGN.md), 전체 계약과 스키마는 [../ARCHITECTURE.md](../ARCHITECTURE.md)를 참고한다.

## Quickstart

### 1. 의존성 설치
```bash
npm install
```

### 2. 로컬 개발 환경 설정
`.dev.vars.example`을 복사하여 `.dev.vars`를 생성하고 환경 변수를 지정한다.
```bash
cp .dev.vars.example .dev.vars
```

### 3. 로컬 개발 서버 실행
```bash
npm run dev
```

### 4. 테스트 실행
```bash
npm test
```

### 5. 배포
```bash
npm run deploy
```
