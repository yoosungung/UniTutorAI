# frontend THEME.md

UniTutor 웹 클라이언트의 현대적이고 미려한 UI/UX를 위한 디자인 시스템 및 테마 가이드다. 화면 동작 계약은 [../ARCHITECTURE.md](../ARCHITECTURE.md), 사용자 경험은 [../docs/PRODUCT.md](../docs/PRODUCT.md)를 따른다.

---

## 1. 디자인 철학: "Calm, Focused, Scholarly"

UniTutor는 고밀도 대학 강의와 소크라테스식 1:1 대화가 공존하는 **몰입형 학술 캔버스**다.
- **인지 부하 최소화 (Cognitive Calm)**: 시각적 장식이나 과도한 배너를 배제하고, '플레이어', '단 하나의 질문', '수식', '카드'에만 시선이 머물도록 한다.
- **다크 퍼스트 (Dark Mode First)**: 장시간 강의 시청과 야간 학습 시 눈의 피로를 최소화하기 위해 딥 슬레이트(Deep Slate) 다크 테마를 기본으로 채택하며, 고대비 라이트 모드를 함께 지원한다.
- **학술적 신뢰감 (Scholarly Precision)**: 정밀한 타이포그래피, 매끄러운 KaTeX 수식 렌더링, 정교한 마이크로 인터랙션을 통해 명문대 1:1 연구실 튜터링의 감성을 제공한다.

---

## 2. 컬러 시스템 (Color Palette & Semantic Tokens)

CSS 변수 및 Tailwind 토큰과 매핑되는 시맨틱 컬러 구조다.

### 2.1 Dark Theme (Default)
| 토큰명 | Hex | 용도 |
| :--- | :--- | :--- |
| `--bg-base` | `#0B0F19` | 최상위 캔버스 배경 (딥 나이트 블루) |
| `--bg-surface` | `#111827` | 대화 패널, 카드, 사이드바 배경 |
| `--bg-elevated` | `#1F2937` | 입력창, 버튼 기본, 모달, 호버 배경 |
| `--border-subtle` | `#1E293B` | 뷰포트 분할선, 컴포넌트 경계선 |
| `--border-focused`| `#3B82F6` | 포커스 링, 선택된 인용 태그 |
| `--text-primary` | `#F8FAFC` | 튜터 질문, 핵심 수식, 제목 |
| `--text-secondary`| `#94A3B8` | 튜터 속생각 요약, 타임스탬프, 부제 |
| `--text-muted` | `#64748B` | 비활성 텍스트, 안내 플레이스홀더 |

### 2.2 Semantic & Status
| 토큰명 | Hex | 용도 |
| :--- | :--- | :--- |
| `--accent-primary` | `#3B82F6` | 브랜드 액센트, 인터랙티브 요소 (Electric Blue) |
| `--verdict-correct`| `#10B981` | 수식 판정 일치 (`correct`), 완료 마커 |
| `--verdict-wrong` | `#F43F5E` | 수식 판정 불일치 (`incorrect`), 오답 경고 |
| `--badge-detour` | `#F59E0B` | 이해 결손으로 인한 우회 경로 (`detour`) |
| `--card-fade` | `#8B5CF6` | 기억 파지율 하강 카드 (`ReviewCard.fadesAt`) |

---

## 3. 타이포그래피 (Typography)

한글과 영문, 학술 수식(KaTeX), 코드 폰트가 일관된 리듬을 형성해야 한다.

- **Primary Font**: `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif`
- **Math Font**: `KaTeX_Main`, `KaTeX_Math`, `Times New Roman`, `serif`
- **Code Font**: `JetBrains Mono`, `SF Mono`, `monospace`

| 스타일 | 크기 / 줄간격 | 두께 | 적용 영역 |
| :--- | :--- | :--- | :--- |
| `display` | 24px / 32px | Bold (700) | 오늘 할 일 헤드라인, 코스 제목 |
| `headline` | 18px / 26px | SemiBold (600) | 튜터의 유도 질문 (`TutorTurn.question`) |
| `body-lg` | 15px / 24px | Regular (400) | 튜터 해설 및 피드백 본문 |
| `body-sm` | 13px / 20px | Regular (400) | 속생각 접힘 줄, 타임스탬프 인용 |
| `caption` | 11px / 16px | Medium (500) | 슬라이드 번호, 분할 핸들 비율 레이블 |

---

## 4. 적응형 2분할 캔버스 레이아웃 가이드

화면비에 따라 매끄럽게 적응하는 분할 뷰포트 구조다.

### 4.1 뷰포트 모드
1. **모바일 세로 (Portrait, `< 768px`)**:
   - 상단: 16:9 비율 유지 YouTube 플레이어 (`width: 100%`).
   - 중앙: 12px 높이의 수평 드래그 핸들 (위/아래 비율 조절).
   - 하단: 독립 스크롤 대화창 (키보드 호출 시 리사이즈 대응).
2. **데스크톱 / 가로 태블릿 (Landscape, `≥ 768px`)**:
   - 좌측: 16:9 플레이어 및 상단 개념 내비게이션 바.
   - 중앙: 8px 너비의 수직 드래그 핸들 (좌/우 비율 조절).
   - 우측: 고정 헤더와 스크롤 가능한 튜터 문답 패널.

### 4.2 스냅 핸들 인터랙션
- 비율 프리셋: `7:3` (강의 집중) $\leftrightarrow$ `5:5` (균형) $\leftrightarrow$ `3:7` (대화 집중).
- 드래그 종료 시 가장 가까운 프리셋으로 자석처럼 달라붙는(Snapping) 스프링 애니메이션 적용.
- 핸들 중앙에 미세한 3점 그리퍼(Gripper dots)를 배치하여 드래그 가능함을 암시.

---

## 5. 핵심 컴포넌트 UX 상세

### 5.1 소크라테스 튜터 말풍선 (`TutorBubble`)
- **속생각 아코디언 (Thinking Traces)**:
  - 튜터 답변 상단에 `[ 💭 추론 과정 접힘 ]` 형태로 한 줄 컴팩트 렌더링.
  - 클릭 시 높이가 부드럽게 펼쳐지며 흐린 폰트(`text-secondary`)로 내부 판단 맥락 표시.
- **핵심 질문 강조**:
  - 소크라테스 유도 질문은 별도의 굵은 타이포와 인디고 좌측 액센트 바(`border-l-4 border-blue-500`)로 시각적 위계를 줌.
- **인용 태그 (`CitationTag`)**:
  - `[14:23 - 역행렬의 성질]` 형태의 글래스모피즘(Glassmorphism) 배지.
  - 클릭 시 플레이어가 즉각 해당 초로 탐색되며, 배지 주변에 1회성 펄스(Pulse) 하이라이트 발광.

### 5.2 수식 입력기 및 실시간 판정 배지 (`MathInput`)
- 사용자가 `A^{-1}` 등 LaTeX 수식을 입력하면 하단에 실시간 KaTeX 미리보기 즉시 렌더링.
- 클라이언트 WASM/MathJS 판정 완료 시:
  - 일치: 녹색 체크 배지 `✓ 수식 일치`가 팝업되며 문답 진행.
  - 불일치: 붉은색 배지 `✕ 유도 과정 점검 필요`와 함께 재시도 유도.

### 5.3 복습 카드 (`ReviewCard`)
- 세션 종료 시 생성되는 카드 1장:
  - 상단: 개념 태그 및 강의 시각 바로가기.
  - 본문: 핵심 1문장 요약 + 오답이었던 확인 문항.
- **망각 시각화 (Fading Effect)**:
  - 기억 파지율이 90% 이상일 때는 또렷한 실선 테두리.
  - `fadesAt` 시점에 도달하면 테두리가 은은한 퍼플 그라데이션으로 점멸하며 복습 필요를 직관적으로 암시.

---

## 6. 마이크로 인터랙션 및 접근성

- **트랜지션**: 캔버스 분할 크기 변경 및 모달 전환은 `transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1)` 적용.
- **포커스 링**: 키보드 탭 이동 시 2px 두께의 고대비 블루 아웃라인(`outline: 2px solid #3B82F6`).
- **모바일 햅틱**: 인용 딥링크 클릭, 수식 정답 판정 시 진동 피드백(`navigator.vibrate(15)`).
- **터치 타깃**: 모바일 기본 브라우저 기준 모든 클릭 가능한 버튼/태그의 최소 터치 영역 $44 \times 44\text{px}$ 보장.
