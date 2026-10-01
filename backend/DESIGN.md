# backend DESIGN.md

UniTutor의 백엔드 컴포넌트 내부 설계다. 컴포넌트 간 계약과 교환 데이터 형태는 루트 [ARCHITECTURE.md](../ARCHITECTURE.md)를 따른다.

## 1. 개요 및 인프라

- **인프라**: Cloudflare Workers (Edge Serverless).
- **프레임워크**: Hono (Web 표준 Fetch API 기반 초경량 라우터).
- **런타임 특성**: Cold-start가 거의 없는 V8 Isolate 기반 분산 엣지 환경에서 구동되며, 유휴 상태 비용이 $0이다.

## 2. 내부 책임

1. **`TutorTurn` 추론 라우팅 (Model Cascade & Prompt Caching)**
   - 클라이언트 요청을 받아 시맨틱 캐시(KV/인메모리)를 1차 점검한다.
   - 캐시 미스 시 강좌 메타데이터와 직전 대화 맥락을 시스템 프롬프트 프리픽스로 고정하여 LLM Provider(Gemini 2.5 Flash-Lite / DeepSeek)에 프롬프트 캐싱 형태로 질의한다.
   - 응답은 SSE(Server-Sent Events) 형태로 클라이언트에 실시간 스트리밍한다.
2. **정적 강좌 데이터 서빙**
   - 사전 가공된 강좌 정의, VTT 자막 매핑, 정적 지식 DAG JSON을 Cloudflare R2 또는 Worker Assets를 통해 서빙한다.
3. **선택적 동기화 API**
   - 학습자의 로컬 진도 및 FSRS 복습 카드를 클라우드에 백업하고자 할 때 최소한의 동기화 엔드포인트를 제공한다 (Cloudflare D1 SQLite 기반).

## 3. 내부 디렉터리 구조

```
backend/
├── DESIGN.md          # 내부 설계 (이 문서)
├── README.md          # 로컬 개발 및 실행 안내
├── wrangler.jsonc     # Cloudflare Workers 설정
├── package.json       # 의존성 및 스크립트
├── tsconfig.json      # TypeScript 설정
└── src/
    ├── index.ts       # Worker 진입점 (Hono 앱 생성 및 라우터 마운트)
    ├── routes/        # HTTP 및 SSE 엔드포인트
    │   ├── tutor.ts   # 소크라테스 튜터 추론 스트리밍
    │   ├── courses.ts # 정적 강좌 메타 및 DAG 서빙
    │   └── sync.ts    # 학습 상태 백업/동기화 (선택)
    ├── services/      # 외부 LLM Provider 및 비즈니스 로직
    │   ├── llm.ts     # Gemini/DeepSeek API 호출 및 프롬프트 캐싱 제어
    │   └── cache.ts   # 응답 및 메타데이터 캐시 관리
    └── types/         # Worker 내부 타입 정의
```

## 4. 환경 변수 및 바인딩 (wrangler)

- `GEMINI_API_KEY`: 튜터 추론용 API 키.
- `COURSE_STORAGE`: 강좌 정적 자산용 R2 버킷 바인딩 (선택).
- `CACHE_KV`: 빈출 질의 시맨틱 캐시용 Workers KV 네임스페이스.

## Commands

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (Wrangler 로컬 에뮬레이션)
npm run dev

# 단위/통합 테스트 실행
npm test

# 배포 설정·번들 dry-run (업로드 없음)
npm run deploy:dry-run

# Cloudflare Workers 배포
# D1 바인딩이 생기면 apply --remote 성공 후에만 deploy (deploy/SETUP.md · wiki D1-before-deploy)
npm run deploy
```