# REA 조사 기록

조사일: 2026-10-26

## 사용 도구

- REA 6.8.0
- 별도 임시 설치한 Node 24.22.1 (시스템 Node 24.5.0은 변경하지 않음)
- Codex CLI 0.164.0, macOS x64

REA MCP 전역 등록이나 Codex 설정 변경 없이 CLI로 분석했습니다. 도구는 `/private/tmp/codex-hud-rea-tools`에 설치했습니다. 임시 폴더는 영구 설치 위치가 아니며, 아래 명령 재현 시 다시 준비해야 할 수 있습니다.

## JavaScript 실행기 분석

```sh
/private/tmp/codex-hud-rea-tools/node_modules/node/bin/node \
  /private/tmp/codex-hud-rea-tools/node_modules/rea-agents/scripts/rea.mjs \
  analyze-javascript-application \
  /usr/local/lib/node_modules/@openai/codex/bin --json
```

- Evidence ID: `ev_2b95fa0e42c4a37228c020a03ffd9a253f23cd89eb9d1e31704a2d232ce9c8f2`
- 입력 디렉터리 SHA-256: `5e92a3537b39cafa7735fc8333e95b37b0e761ce4acc6e0264504c214946b3ea`
- JavaScriptApplicationGraph: 14 nodes, 15 edges.
- 분석은 정적 구문 및 관계 추론입니다. 실행 여부나 네이티브 TUI 구현을 증명하지 않습니다.
- 최초 시도는 샌드박스의 macOS 보조 프로그램 컴파일 제한으로 실패했고, 승인 후 재실행하여 성공했습니다.

원본은 `codex-launcher-evidence.json`에 보관하며 `.gitignore`에서 제외합니다.

## 네이티브 파일 조사

```sh
/private/tmp/codex-hud-rea-tools/node_modules/node/bin/node \
  /private/tmp/codex-hud-rea-tools/node_modules/rea-agents/scripts/rea.mjs \
  inspect-artifact \
  /usr/local/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-x64/vendor/x86_64-apple-darwin/bin/codex \
  --json
```

원본은 `codex-native-evidence.json`에 보관합니다. 네이티브 디컴파일러를 설치하거나 TUI 바이너리를 패치하지 않았습니다.

## HUD 구현의 직접 근거

상태 표시줄 식별자는 REA의 JavaScript 분석에서 추측하지 않았습니다. 아래 공식 설정 문서와 설치 버전의 공개 소스를 확인하고 실제 실행으로 검증했습니다.

- [공식 설정 레퍼런스: tui.status_line](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Codex 0.164.0 status_line_setup.rs](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/tui/src/bottom_pane/status_line_setup.rs)
- [REA 저장소](https://github.com/morluto/rea)
- [Claude HUD 참고](https://github.com/jarrodwatts/claude-hud)

설치된 실행기의 TUI 스모크 테스트에서 하단 모델·Context 사용률·Ready/Starting 상태·주간 잔여량이 표시됐으며 Ctrl-C로 정상 종료했습니다. 실제 작업 요청, 에이전트 실행, 작업 진행률 갱신은 아직 통합 검증하지 않았습니다.
