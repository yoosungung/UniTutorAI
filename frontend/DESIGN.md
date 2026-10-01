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
   - mock 턴(`data/mockTutorTurn.ts`)으로 백엔드 없이 캔버스 검증.
3b. **지식 DAG · 경로 · detour (2단계)**
   - 정적 DAG JSON은 `content/fixtures/`(SourceSpan 옆). 런타임은 `lib/pathFromOnboarding`·`lib/detour`.
   - 온보딩 후 `PathView`에 `planned`/`skipped`/`current`/`detour` 표시.
   - `DetourInserted` 시 `returnToSpanId` 채우고, 우회 종료 후 같은 캔버스에서 원래 질문 복귀.
4. **클라이언트 사이드 연산 오프로딩 (Zero Server Cost)**
   - **수식 실시간 판정**: Math.js 또는 Pyodide(WASM Python/SymPy)를 브라우저 내에서 구동하여 서버 호출 없이 기호 연산 정오답 판정.
   - **KaTeX 렌더러**: 입력 즉시 LaTeX 수식을 실시간 렌더링.
   - **기억 스케줄러 (`ts-fsrs`)**: FSRS 머신러닝 스케줄러를 브라우저 로컬에서 계산하여 `ReviewCard` 생성 및 망각 곡선 추적.
   - **로컬 우선 영속화**: IndexedDB / LocalStorage를 통해 진도와 복습 카드를 로컬에 1차 저장.
5. **튜터 상호작용 및 스트리밍 처리**
   - 백엔드 Workers의 SSE 스트림을 수신하여 실시간 튜터 말풍선 렌더링.
   - 3단계 에스컬레이션(힌트 반복 시 직전 단서 설명 요구)의 1차 감지 및 템플릿 처리.
6. **웹 푸시 및 PWA**
   - 서비스 워커(`sw.js`) 및 Web Push API를 이용해 카드가 흐려진 시점(`fadesAt`)에 알림 발송.

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
│   ├── mathCheck.ts # 클라이언트 수식 동치 판정 로직 (MathJS/WASM)
│   └── storage.ts # IndexedDB 로컬 상태 영속화
    ├── hooks/         # 뷰포트 반응형 훅, SSE 스트리밍 훅 등
    └── types/         # 프론트엔드 전용 내부 타입 정의
```

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
```
