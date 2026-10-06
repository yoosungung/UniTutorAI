# ARCHITECTURE.md

화면에서 느껴지는 경험은 [docs/PRODUCT.md](docs/PRODUCT.md)에 있다. 이 문서는 그 화면이 깨지지 않게 컴포넌트 사이에 지킬 동작과, 그 동작을 주고받는 형태만 적는다.

## 1. 계약

- 공부 세션은 재생과 질문이 한 캔버스에 같이 있는 동안만 이어진다. 장면과 말이 서로 다른 곳으로 갈라지면 세션이 아니다.
- UI는 단일 웹(Web) 애플리케이션이며, iOS(Safari), Android(Chrome), Windows(Edge/Chrome), macOS(Safari/Chrome)의 기본 브라우저에서 뷰포트에 맞춘 적응형(세로 상하 / 가로 좌우 2분할)으로 동작한다. 설치 가능한 PWA 셸(`manifest`·icons·`display`)은 허용하되, 강의·튜터 오프라인 캐시·서버 Push 구독·네이티브 스토어 앱은 계약 밖이다.
- `TutorTurn`은 유도 질문 하나다. 정답, 완성된 식, 풀이 전문은 그 턴에 실리지 않는다.
- 인용을 고르면 플레이어는 해당 `SourceSpan`의 시작 시각으로 이동한다.
- 튜터 UI는 플레이어 영역을 가리지 않는다.
- 짚을 `SourceSpan`이 없으면 `TutorTurn`은 추측 설명을 담지 않고, 이 강의 범위 밖이라는 말과 다음에 할 행동만 담는다.
- 수식 판정이 있으면 문장보다 먼저 온다. 판정과 어긋나는 풀이는 실리지 않는다.
- `ReviewCard`는 세션이 닫힐 때 한 장 생긴다.
- 우회는 경로에 `SourceSpan`을 끼워 넣는다. 그 구간이 끝나면 원래 장면의 질문으로 돌아온다.
- LTI 런치는 **세션 입장**(identity + `CourseRef` 바인딩)만 담당한다. `TutorTurn`·`SourceSpan` 계약을 바꾸지 않는다.
- LTI `id_token`은 Platform JWKS로 서명 검증한다(unsigned·만료 거부). fail-closed.
- LTI 학습자는 D1에 `(iss, client_id, deployment_id, sub)`로 링크한다(옵션 B). 이메일 등 PII claim은 필수 저장하지 않는다.
- AGS·NRPS·Deep Linking·LTI 1.1은 이 계약 밖이다.

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

### 2.6 Tutor 추론 HTTP

| 메서드 | 경로 | 결과 |
|--------|------|------|
| `POST` | `/api/tutor/turn` | `Content-Type: text/event-stream` SSE |

요청 JSON(최소): `courseId`, `sourceSpanId`, 선택 `concept`, `escalationStep`(1\|2\|3), `learnerMessage`.

선택 헤더: `X-UniTutor-Byok-Key` — 학습자 브라우저 BYOK(Gemini) 키 **one-shot**. 서버 DB·KV에 저장하지 않는다. 헤더가 있으면 앱 `GEMINI_API_KEY`보다 우선하며, 응답·SSE `error`에 키 값을 넣지 않는다.

SSE 이벤트 이름:

| `event` | `data` | 의미 |
|---------|--------|------|
| `tutor_turn_delta` | `{ "text": string }` | 유도 질문 조각(누적 가능) |
| `tutor_turn` | `TutorTurn` JSON | 최종 턴. §1/§2.3 계약(`assertValidTutorTurn`) |
| `error` | `{ "error": string }` | 스트림 중 실패. 비밀·키 값 미포함 |

앱 `GEMINI_API_KEY`와 BYOK 헤더가 **둘 다** 없으면 SSE를 열지 않고 **503** `{ "error": "llm_unavailable" }`(키 미노출). MVP Provider는 Gemini만; 프롬프트 캐싱·DeepSeek cascade는 후속.

**클라이언트 라우팅 우선순위(학습자 opt-in):** 온디바이스 WebLLM이 켜져 있으면 Workers SSE를 호출하지 않는다. WebGPU 불가·로드 실패 시 명시적 `on_device_unsupported` / `on_device_failed`만 노출하고 클라우드로 조용히 넘기지 않는다. 오프이면 기존 BYOK 헤더 → 앱 `GEMINI_API_KEY` 경로를 쓴다.

### 2.7 LTI 1.3 입장 HTTP

| 메서드 | 경로 | 결과 |
|--------|------|------|
| `GET` | `/lti/oidc/login` | Platform 3rd-party login 개시 → Platform auth URL로 302 |
| `POST` | `/lti/launch` | form `id_token`(+`state`) **JWKS 서명 검증** → FE 공부 캔버스 302 |

쿼리/폼 최소값과 JWT claim 매핑:

| 입력 | 의미 |
|------|------|
| `iss`, `client_id`, `login_hint`, `target_link_uri`, `lti_message_hint`, `lti_deployment_id` | OIDC login 개시(Platform→Tool) |
| `id_token` JWT `sub` | LMS 사용자(불투명) |
| `iss` + `aud`(=client_id) + `deployment_id` claim | `LtiDeployment` 키 |
| `resource_link.id` claim | 시드된 `CourseRef.id`로 매핑 |

성공 리다이렉트(최소): `{FRONTEND_ORIGIN}/?courseId={CourseRef.id}&ltiLearnerId={LtiLearner.id}`.

### 2.8 `LtiLearner`

| 필드 | 의미 |
|------|------|
| `id` | UniTutor 쪽 학습자 링크 id |
| `iss` | Platform issuer |
| `clientId` | Tool client_id (`aud`) |
| `deploymentId` | Platform deployment_id |
| `subject` | JWT `sub` |
