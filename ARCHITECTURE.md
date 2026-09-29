# ARCHITECTURE.md

화면에서 느껴지는 경험은 [docs/PRODUCT.md](docs/PRODUCT.md)에 있다. 이 문서는 그 화면이 깨지지 않게 컴포넌트 사이에 지킬 동작과, 그 동작을 주고받는 형태만 적는다.

## 1. 계약

- 공부 세션은 재생과 질문이 한 캔버스에 같이 있는 동안만 이어진다. 장면과 말이 서로 다른 곳으로 갈라지면 세션이 아니다.
- `TutorTurn`은 유도 질문 하나다. 정답, 완성된 식, 풀이 전문은 그 턴에 실리지 않는다.
- 인용을 고르면 플레이어는 해당 `SourceSpan`의 시작 시각으로 이동한다.
- 튜터 UI는 플레이어 영역을 가리지 않는다.
- 짚을 `SourceSpan`이 없으면 `TutorTurn`은 추측 설명을 담지 않고, 이 강의 범위 밖이라는 말과 다음에 할 행동만 담는다.
- 수식 판정이 있으면 문장보다 먼저 온다. 판정과 어긋나는 풀이는 실리지 않는다.
- `ReviewCard`는 세션이 닫힐 때 한 장 생긴다.
- 우회는 경로에 `SourceSpan`을 끼워 넣는다. 그 구간이 끝나면 원래 장면의 질문으로 돌아온다.

## 2. 형태

식별자는 컴포넌트 사이에서 그대로 주고받는다. 화면 문구와 비율은 PRODUCT에 있다.

### 2.1 `CourseRef`

강의를 가리키는 참조다.

| 필드 | 의미 |
|------|------|
| `id` | 강의 식별자 |
| `title` | 강의 이름 |
| `subject` | 과목 |
| `playbackUrl` | 앱 안 플레이어가 여는 재생 주소 |

### 2.2 `SourceSpan`

강의 안의 한 장면이다.

| 필드 | 의미 |
|------|------|
| `id` | 장면 식별자 |
| `courseId` | `CourseRef.id` |
| `concept` | 개념 이름 |
| `startSec` | 시작 시각(초) |
| `endSec` | 끝 시각(초) |
| `slideLabel` | 슬라이드 위치. 없으면 비운다 |

경로는 `SourceSpan`을 순서대로 가리키는 항목이다. 같은 장면이 경로마다 다른 자리에 놓일 수 있으므로, 자리 표시는 장면에 붙이지 않는다.

| 필드 | 의미 |
|------|------|
| `sourceSpanId` | `SourceSpan.id` |
| `placement` | `planned` \| `skipped` \| `current` \| `detour` |
| `returnToSpanId` | `placement`가 `detour`일 때 돌아갈 장면. 그 외에는 비운다 |

### 2.3 `TutorTurn`

한 번의 말풍선이다.

| 필드 | 의미 |
|------|------|
| `id` | 턴 식별자 |
| `sourceSpanId` | 지금 이야기하는 장면 |
| `question` | 유도 질문 하나 |
| `escalationStep` | `1` 방향, `2` 구조 단서, `3` 직전 단서 설명 요구 |
| `citations` | 눌러 이동할 `SourceSpan.id` 목록 |
| `scope` | `in_lecture` \| `out_of_scope` |
| `formulaVerdict` | `correct` \| `incorrect` \| 없음 |

`escalationStep` 3은 학습자가 그 사이 시도 없이 힌트만 연속으로 요청했을 때다. `scope`가 `out_of_scope`이면 `citations`는 비우고 `question`은 범위 밖임과 다음 행동이다.

### 2.4 `ReviewCard`

세션을 닫으며 남기는 카드다.

| 필드 | 의미 |
|------|------|
| `id` | 카드 식별자 |
| `sourceSpanId` | 복습이 가리키는 장면 |
| `summary` | 세션 끝 요약 |
| `createdAt` | 세션이 닫힌 시각 |
| `fadesAt` | 이 시각부터 홈과 알림에 올릴 수 있다 |

### 2.5 이벤트

| 이벤트 | 언제 | 결과 |
|--------|------|------|
| `CitationSelected` | 인용을 누름 | 플레이어가 `SourceSpan.startSec`로 이동 |
| `DetourInserted` | 질문이 막힘 | 경로에 `placement=detour`인 장면이 끼워지고 `returnToSpanId`가 채워짐 |
| `SessionClosed` | 짧은 확인과 피드백이 끝남 | `ReviewCard` 한 장 생성 |
| `CardFaded` | `fadesAt`에 도달 | 홈의 다시 볼 카드와 알림 후보가 됨 |
