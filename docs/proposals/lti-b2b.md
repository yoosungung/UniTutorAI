# Proposal: 대학 LMS / LTI B2B 연동 (초안)

**상태:** Eric 승인 대기 · 계약 미반영  
**티켓:** `4aa8d43d-4ad6-42b0-bd1c-a0d83caaf061`  
**wiki:** LTI/LMS 항목 miss → 외부 스펙 요약(아래 sources). canonical 승격은 `@km` 판단.

이 문서는 [ARCHITECTURE.md](../../ARCHITECTURE.md) / [backend/DESIGN.md](../../backend/DESIGN.md)에 넣기 **전** 초안이다. 공개 API·테넌트 데이터·식별자 매핑은 승인 후에만 계약으로 올린다.

## 1. Goal / Non-goals

**Goal:** LMS에서 UniTutor 공부 캔버스로 들어가는 **최소 LTI Tool** 연동(스파이크 또는 MVP).

**Non-goals (이번 범위 밖):**

- 전체 SIS/수강신청/결제
- LTI 1.1 (OAuth 1.0a consumer key/secret) 신규 지원
- Deep Linking·Assignment and Grade Services(AGS)·Names and Role Provisioning(NRPS) 풀스택

## 2. 권장 버전

| 항목 | 권장 | 이유 |
|------|------|------|
| 프로토콜 | **LTI 1.3** (1EdTech / IMS LTI Core) | OIDC + signed JWT. Canvas/Moodle/Blackboard 현행 표준 |
| 메시지 | **Resource Link launch** (`LtiResourceLinkRequest`) | 최소 “수업 링크 → 캔버스” |
| Advantage 확장 | MVP에서 **제외** (후속) | AGS/NRPS/Deep Linking은 계약·PII·서버 상태 폭발 |

LTI 1.1은 레거시 마이그레이션용으로만 후순위. 신규 B2B는 1.3만.

## 3. 런치 흐름 (Tool 관점)

등록과 배포는 분리한다: Tool **registration** 1회 → LMS **deployment**마다 `deployment_id`.

```
LMS(Platform)                    UniTutor(Tool / Workers)
     |                                      |
     | 1) 3rd-party OIDC login init          |
     |  GET /lti/oidc/login                  |
     |   iss, login_hint, target_link_uri,   |
     |   client_id, lti_message_hint,        |
     |   lti_deployment_id?                  |
     | ------------------------------------> |
     |                                      | state/nonce 발급·보관(단기)
     | 2) redirect → Platform auth endpoint  |
     | <------------------------------------ |
     |                                      |
     | 3) form POST id_token(+state)         |
     |  POST /lti/launch                     |
     | ------------------------------------> |
     |                                      | JWT 검증(iss/aud/nonce/
     |                                      |  deployment_id/JWKS)
     | 4) 302 → FE 공부 캔버스               |
     |     (?courseId=…&lti_session=…)       |
     | <------------------------------------ |
```

검증 실패 시 캔버스로 보내지 않고 정적 오류 페이지만 반환한다. iframe 3rd-party cookie 제약은 state를 **same-site first-party cookie 또는 signed state param**으로 처리하는 스파이크 항목이다.

## 4. 식별자 매핑 (초안)

| LTI claim / 값 | UniTutor 쪽 | 메모 |
|----------------|-------------|------|
| `iss` + `aud`(client_id) + `deployment_id` | `LtiDeployment` 키 | 테넌트(캠퍼스 LMS 설치) 경계 |
| `sub` | `LtiSubject` (불투명) | LMS 사용자. 이메일 필수 아님 |
| `https://purl.imsglobal.org/spec/lti/claim/resource_link`.id | → `CourseRef.id` **또는** 배포별 매핑 테이블 | 강의 연결 |
| `https://purl.imsglobal.org/spec/lti/claim/context`.id | 선택 로그/후속 코호트 | MVP에서 학습 경로 키로 쓰지 않음 |
| roles | `learner` 허용 / instructor는 미리보기만(후속) | 성적 회신은 Non-goal |

**학습 상태:** 기존 local-first(`unitutor:learner:{CourseRef.id}`)를 유지하려면 런치 후 키를  
`unitutor:learner:{CourseRef.id}:lti:{sha256(iss|deployment_id|sub)}` 처럼 **네임스페이스만 분리**하는 옵션이 있다(서버 계정 불필요).

## 5. 공개 API 영향 (승인 대상)

제안 경로(모두 Workers, 세션 쿠키 로그인과 별개):

| Method | Path | 역할 |
|--------|------|------|
| `GET` | `/lti/oidc/login` | Platform→Tool OIDC 개시 |
| `POST` | `/lti/launch` | `id_token` 수신·검증·리다이렉트 |
| `GET` | `/.well-known/jwks.json` (또는 `/lti/jwks`) | Tool 공개키 (후속 Advantage용; MVP launch-only면 Platform JWKS만 필요) |

**넣지 않음(MVP):** grade passback, roster sync, 관리자용 테넌트 CRUD UI(초기에는 env/시드 JSON으로 배포 등록 가능).

기존 `POST /api/tutor/turn` 계약은 변경하지 않는다. LTI는 **입장(identity + course binding)** 만 담당한다.

## 6. 테넌트 데이터 (승인 대상)

| 데이터 | 저장 위치 후보 | 민감도 |
|--------|----------------|--------|
| Platform 등록 (`iss`, client_id, auth/token/jwks URL) | Worker 시크릿/D1 | 중 — 공개 메타 + 신뢰 앵커 |
| `deployment_id` ↔ 고객/코스 매핑 | D1 | 중 — B2B 계약 단위 |
| `sub`, 이름, 이메일 | **기본 저장 안 함** | 고 — PII. 옵션 B에서만 |
| 진도·ReviewCard | 현행 localStorage (옵션 A) 또는 D1 sync (옵션 C) | 중 |

## 7. 구현 옵션 (Eric 선택)

| 옵션 | 내용 | 장점 | 단점 |
|------|------|------|------|
| **A — Launch-only + local namespace (권장 MVP)** | 1.3 Resource Link → JWT 검증 → 캔버스. `sub`는 브라우저 키 접두만. 서버에 PII 없음 | 기존 local-first·비용 $0 원칙과 정합 | 기기 이동 시 진도 비공유; B2B 리포트 약함 |
| **B — Launch + 서버 learner 링크** | `(iss,deployment_id,sub)` → D1 learner; 선택적 이메일 claim | 멀티 디바이스·기관 리포트 | PII·계정 모델·동의/삭제 정책 필요 |
| **C — A + AGS 성적 패스백** | 세션 종료 시 score → LMS | 구매 설득력 | Non-goal 위반에 가깝고 계약·테스트 표면 큼 |

**스파이크 성공 기준(옵션 A 가정):** mock Platform JWT로 `/lti/launch`가 `CourseRef` 캔버스로 302; 잘못된 `aud`/만료 nonce는 4xx; 단위 테스트로 claim 검증.

## 8. ARCHITECTURE / DESIGN 반영 예정 (승인 후)

승인 시 초안을 다음으로 옮긴다.

- `ARCHITECTURE.md` §1: “LTI 런치는 세션 입장만 담당; TutorTurn·SourceSpan 계약 불변”
- `ARCHITECTURE.md` §2: `LtiDeployment` / 런치 HTTP 표
- `backend/DESIGN.md`: OIDC login·JWT 검증·배포 레지스트리 내부 구조
- `ROADMAP.md` `### 나중`: LMS 항목을 체크 가능 문구로 구체화

## 9. Sources

- wiki: LTI/LMS miss (`/tmp/org-wiki` 검색, 2026-10-04)
- https://www.imsglobal.org/spec/lti/v1p3/migr
- https://standards.1edtech.org/lti/specifications/core/lti-spec
- https://standards.1edtech.org/lti/specifications/guides/implementation_guide/implementation-guide
