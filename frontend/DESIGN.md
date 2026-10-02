# frontend DESIGN.md

UniTutor의 프론트엔드 컴포넌트 내부 설계다. 컴포넌트 간 계약과 화면 규칙은 루트 [ARCHITECTURE.md](../ARCHITECTURE.md) 및 [docs/PRODUCT.md](../docs/PRODUCT.md)를 따르며, UI/UX 디자인 시스템과 테마 가이드는 [THEME.md](THEME.md)에 둔다.

## 1. 개요 및 인프라

- **스택**: React 18+ / TypeScript / Vite / CSS Modules or Tailwind CSS.
- **배포 인프라**: Cloudflare Pages (정적 사이트 빌드 결과물 `dist/` 전세계 엣지 CDN 무료 배포).
- **타깃 환경**: 4대 OS 기본 브라우저(iOS Safari, Android Chrome, Windows Edge/Chrome, macOS Safari/Chrome) 적응형 웹.

## 2. 내부 책임 및 아키텍처

1. **적응형 2분할 캔버스 (Two-pane Responsive Canvas)**
   - 미디어 쿼리(ResizeObserver)로 뷰포트 감지:
     - 세로 뷰포트 (모바일): 상하 분할 (상단 플레이어, 하단 튜터 대화).
     - 가로 뷰포트 (데스크톱/태블릿 가로): 좌우 분할 (좌측 플레이어, 우측 튜터 대화).
   - 드래그 가능한 분할 핸들을 제공하며 `7:3`, `5:5`, `3:7` 세 단계 스냅 비율 지원.
2. **YouTube Iframe 플레이어 컨트롤러**
   - YouTube IFrame Player API 연동.
   - `CitationSelected` 이벤트 발생 시 지정된 `SourceSpan.startSec`로 정확히 탐색(`seekTo`) 및 재생.
   - 1단계 구현: embed URL `?start=` 재마운트(nocookie). IFrame API `seekTo`는 후속 고도화.
   - 플레이어 영역 위에 어떤 튜터 UI도 오버레이되지 않도록 독립 DOM 격리.
3. **TutorTurn UI (1질문 + 인용)**
   - `TutorTurnView`: `question` 하나 + `citations` 버튼. 정답/풀이 필드 없음.
   - `scope=out_of_scope`이면 citations 숨김·범위 밖 안내만.
   - 런타임은 `lib/tutorStream.ts`가 `POST /api/tutor/turn` SSE를 소비한다. `data/mockTutorTurn.ts`는 단위 테스트 픽스처만.
3b. **지식 DAG · 경로 · detour (2단계)**
   - 정적 DAG JSON은 `content/fixtures/`(SourceSpan 옆). 런타임은 `lib/pathFromOnboarding`·`lib/detour`.
   - 온보딩 후 `PathView`에 `planned`/`skipped`/`current`/`detour` 표시.
   - `DetourInserted` 시 `returnToSpanId` 채우고, 우회 종료 후 같은 캔버스에서 원래 질문 복귀.
4. **클라이언트 사이드 연산 오프로딩 (Zero Server Cost)**
   - **수식 실시간 판정**: **Math.js** (`lib/mathCheck.ts`). Pyodide는 초기 WASM·로드 비용이 커서 이번 범위에서 채택하지 않음. `checkFormula(learner, expected)` → `correct`|`incorrect`; UI는 `formulaVerdict`를 튜터 문장보다 먼저 반영하고, incorrect여도 정답/풀이를 `TutorTurn`에 싣지 않는다.
   - **KaTeX 렌더러**: 입력 즉시 LaTeX 수식을 실시간 렌더링.
   - **기억 스케줄러 (`ts-fsrs`)**: FSRS 머신러닝 스케줄러를 브라우저 로컬에서 계산하여 `ReviewCard` 생성 및 망각 곡선 추적. `lib/fsrs.ts`가 `SessionClosed` → `ReviewCard`(`fadesAt`=`card.due`)를 만든다. 기본 파라미터는 `enable_fuzz=false`(로컬 상수).
   - **로컬 우선 영속화**: `lib/storage.ts`가 `localStorage` 키 `unitutor:learner:{CourseRef.id}`에 진도(`PathItem[]`·`current`/`detour`)·오답(`wrongAnswers`)·`reviewCards`를 저장·복원한다. quota/private 모드 실패 시 no-op(graceful degrade). `lib/sessionClose.ts`가 세션 종료 시 카드 1장을 append. IndexedDB는 후속.
5. **튜터 상호작용 및 스트리밍 처리**
   - `hooks/useTutorTurn.ts` + `lib/tutorStream.ts`: Workers SSE(`tutor_turn_delta`/`tutor_turn`)를 수신해 `TutorTurnView`에 반영.
   - 네트워크·503 실패 시 짧은 오류 문구; 로컬 템플릿 폴백은 개발용만(`import.meta.env.DEV`).
   - 3단계 에스컬레이션(힌트 반복 시 직전 단서 설명 요구)의 1차 감지 및 템플릿 처리.
6. **웹 푸시 및 PWA (`CardFaded`)**
   - `public/sw.js` + `lib/reviewNotify.ts`: 알림 권한 `granted`일 때 `ReviewCard.fadesAt` 도달 카드를 `CardFaded`로 처리하고 서비스 워커 `showNotification`으로 개념 이름 알림(PRODUCT 문구).
   - 하루 상한 **3**(ROADMAP 확정). 레저는 `localStorage` 키 `unitutor:review-notify`(UTC day·count·notifiedCardIds). 서버 Push subscription API 없음(FE local).
7. **무료 문답 한도 · 광고 보상 · 유료 스텁 (`TutorTurn`)**
   - `lib/tutorQuota.ts`: 무료 하루 **5**회(ROADMAP). 레저 `unitutor:tutor-quota`(UTC day·count·consumedTurnIds·bonusTurns). 동일 `turn.id`는 당일 재과금 없음.
   - 광고 스텁 `grantAdReward`: 1회당 **+3** (`AD_REWARD_TUTOR_TURNS`). 광고 SDK/벤더 없음 — 계약·보안 전 `@eric.yoo`. BYOK는 후속.
   - 유료 entitlement `unitutor:entitlement` (`plan: paid`). 결제 벤더 없음 — `QuotaGate` 테스트 CTA.

## 3. 내부 디렉터리 구조

```
frontend/
├── DESIGN.md          # 내부 설계 (이 문서)
├── README.md          # 로컬 개발 및 실행 안내
├── vite.config.ts     # Vite 빌드 설정
├── package.json       # 의존성 및 스크립트
├── tsconfig.json      # TypeScript 설정
├── index.html         # SPA 진입 HTML
└── src/
    ├── main.tsx       # React 앱 마운트 진입점
    ├── App.tsx        # 최상위 라우터 및 글로벌 레이아웃
    ├── components/    # UI 컴포넌트
    │   ├── canvas/    # 적응형 2분할 캔버스 및 분할 핸들러
    │   ├── player/    # YouTube IFrame 플레이어 래퍼 (타임스탬프 딥링크)
    │   ├── tutor/     # 소크라테스 튜터 대화창 및 접힌 속생각(Thinking Traces)
    │   ├── path/      # 학습 경로(planned/skipped/current/detour)
    │   ├── onboarding/# 아는 개념 체크 → 경로 축소
    │   └── math/      # KaTeX 수식 입력기 및 클라이언트 수식 판정기
    ├── lib/           # 클라이언트 로컬 엔진
    │   ├── pathFromOnboarding.ts # 온보딩 → PathItem[]
    │   ├── detour.ts  # DetourInserted / returnToSpanId
    │   ├── fsrs.ts    # ts-fsrs 기반 복습 주기 계산 엔진
    │   ├── sessionClose.ts # SessionClosed → ReviewCard + storage append
    │   ├── mathCheck.ts # Math.js 수식 동치 판정 → formulaVerdict
    │   ├── reviewNotify.ts # CardFaded + SW 알림·일 3회 한도
    │   ├── tutorQuota.ts # 무료 5/일 + 광고 +3 스텁 + 유료 entitlement
    │   ├── tutorStream.ts # POST /api/tutor/turn SSE 파서
    │   └── storage.ts # localStorage 진도·오답·reviewCards (키 unitutor:learner:{courseId})
    ├── hooks/         # useLayoutMode, useTutorTurn(SSE) 등
    └── types/         # 프론트엔드 전용 내부 타입 정의
        ├── reviewCard.ts # ReviewCard (ARCHITECTURE §2.4)
        └── events.ts  # CitationSelected / DetourInserted / SessionClosed / CardFaded
```

`components/tutor/QuotaGate.tsx`는 한도 초과 시 광고 충전(+3)·유료 unlock CTA(테스트 스텁).

Vite `public/sw.js`는 빌드 시 사이트 루트로 복사된다.
## 환경 변수 (Vite / Pages)

- `VITE_API_BASE_URL`: Worker origin (끝 `/` 없이). `lib/apiBase.ts`의 `getApiBaseUrl` / `apiUrl`이 사용. 비우면 same-origin 상대 경로. 예시는 `.env.example`, 배포는 [deploy/SETUP.md](../deploy/SETUP.md).

## Commands

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (Vite Dev Server, 기본 http://localhost:5173)
npm run dev

# 프로덕션 빌드 (dist/ 디렉터리로 컴파일)
npm run build

# 빌드 결과물 로컬 미리보기
npm run preview

# 단위 테스트 실행
npm test

# Pages 배포 dry-run (업로드 없음) / 원격 배포
npm run deploy:pages:dry-run
npm run deploy:pages
```