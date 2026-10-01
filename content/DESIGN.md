# content DESIGN.md

UniTutor의 **배치 가공** 컴포넌트 내부 설계다. 컴포넌트 간 `SourceSpan`/`CourseRef` 형태는 루트 [ARCHITECTURE.md](../ARCHITECTURE.md) §2를 따른다.

## 1. 개요

- **역할:** 공개 강의 자막(VTT/SRT)과 개념·슬라이드 라벨 맵을 **오프라인 1회** 가공해 정적 `SourceSpan[]` JSON을 만든다.
- **비역할:** 런타임 인덱싱, 다중 강의 파이프라인, LLM 기반 장면 분할.

## 2. 내부 흐름

1. `parseSubtitles` — VTT 또는 SRT → `SubtitleCue[]` (시각만 사용; 텍스트는 검증·디버그용).
2. `concepts.json` — 노트/슬라이드 TOC에 맞춘 순서 있는 `ConceptMarker` (concept, startSec, slideLabel?).
3. `buildSourceSpans` — 마커 구간을 다음 마커(또는 자막 끝)까지 잘라 `SourceSpan` 필드를 채운다.
4. 산출물 `sourceSpans.json`을 프론트/백엔드가 **그대로 로드**한다. 재인덱싱 없음.
5. 같은 코스 패키지에 정적 `knowledgeDag.json`(노드=`SourceSpan.id`, 선수 간선)을 둔다. 배치 CLI와 분리된 수동·코스 고정 지식이며, 프론트가 온보딩 경로 축소·`DetourInserted`에 쓴다.

## 3. 디렉터리

```
content/
├── DESIGN.md
├── package.json
├── src/                 # 파서·빌더·CLI·테스트
└── fixtures/
    └── cs50p-lecture0/  # 첫 승인 강의 배치 입·출력
```

## Commands

```bash
cd content
npm install
npm test
npm run batch -- \
  --course fixtures/cs50p-lecture0/course.json \
  --concepts fixtures/cs50p-lecture0/concepts.json \
  --subtitles fixtures/cs50p-lecture0/lecture0.vtt \
  --out fixtures/cs50p-lecture0/sourceSpans.json
```
