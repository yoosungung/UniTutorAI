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

### 3. 프로덕션 빌드 (Cloudflare Pages 배포용)
```bash
npm run build
```
빌드 결과물은 `dist/` 폴더에 생성되며, Cloudflare Pages와 연동되어 자동 배포된다.

### 4. 테스트 실행
```bash
npm test
```
