# Claude HUD 방식의 Codex 플러그인 호환성

확인일: 2026-10-26. 설치된 Codex CLI: `0.164.0`.

## 결론

Codex는 플러그인을 지원한다. 그러나 확인한 버전의 지원 인터페이스로는 Claude HUD처럼 외부 프로그램의 출력을 입력창 아래의 상시 HUD로 연결할 수 없다. 현재 저장소는 기본 상태줄의 설정·복구 스킬을 제공하는 설치형 플러그인으로 전환했다. 사용자 지정 HUD 렌더러로 전환한 것은 아니다.

이는 플러그인 배포 자체의 문제가 아니라 **플러그인에서 사용할 HUD 출력 연결 지점의 부재**다. 설정 도우미를 플러그인으로 배포할 수 있다는 사실만으로 사용자 요청의 그래프·두 줄 HUD가 구현되는 것은 아니다.

## 기능별 확인 결과

| 기능 | 본체 수정 없는 Codex 플러그인에서의 범위 |
| --- | --- |
| 플러그인 설치·배포 | 지원. 스킬, MCP 서버, 이벤트 훅 등을 묶을 수 있다. |
| 설정 선택·저장 도우미 | 스킬이나 도구로 구현 가능. 설정 작업이며 HUD 렌더링은 아니다. |
| 모델과 리즈닝 레벨 | 기본 상태줄의 `model-with-reasoning` 또는 `model`, `reasoning` 항목으로 제공. |
| 프로젝트와 Git 브랜치 | 기본 상태줄 항목으로 제공. Git 데이터가 있어야 표시된다. |
| Git 추가 정보 | Codex에는 `pull-request-number`, `branch-changes` 항목도 있다. 후자는 기본 브랜치 대비 커밋된 diff 통계다. 현재 실행기에는 미연결. |
| 컨텍스트·사용 한도 | Codex 기본 항목으로 제공. Claude HUD와 같은 상태줄용 JSON 입력 계약은 확인하지 못했다. |
| 퍼센트 앞 사용자 지정 그래프 | 지원되는 출력 연결 지점 없음. 기본 `context-used`는 숫자 문자열로 생성된다. |
| 입력창 아래 고정된 두 줄 HUD | 지원되는 출력 연결 지점 없음. 상태줄 경로는 하나의 `Line`을 반환한다. |
| 입력창 위아래 사용자 지정 구분선 | 플러그인에서 composer 렌더링을 변경하는 인터페이스 없음. |
| 도구·에이전트 활동 수집 | 이벤트 훅으로 관련 이벤트를 관찰할 수 있음. 이를 고정 HUD에 그리는 기능은 별개이며 지원되지 않음. |

## 코드 경로 근거

공개 소스는 설치 버전과 일치하는 `rust-v0.164.0` 태그로 확인했다.

1. [`core-plugins/src/manifest.rs`](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/core-plugins/src/manifest.rs)의 `RawPluginManifest`는 skills, MCP 서버, apps, hooks, interface 등 플러그인 구성 요소를 읽는다. HUD 렌더러 등록이나 외부 `statusLine` 명령을 연결하는 필드는 없다. `interface`는 표시 메타데이터이며 terminal footer 렌더러가 아니다.
2. [`config/src/types.rs`](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/config/src/types.rs)의 `status_line` 타입은 `Option<Vec<String>>`이다. 명령 실행 설정이 아니라 항목 식별자 목록이다.
3. [`chatwidget/status_surfaces.rs`](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/tui/src/chatwidget/status_surfaces.rs)의 `refresh_status_line_from_selections`는 정해진 항목을 순회해 값을 구한다. `status_line_value_for_item`은 enum을 match하며 `ContextUsed`에 대해 `Context {used}% used` 문자열을 만든다. 이 경로에는 플러그인의 문자열 출력을 받는 호출이 없다.
4. [`bottom_pane/footer.rs`](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/tui/src/bottom_pane/footer.rs)는 `status_line_value: Option<Line<'static>>`를 사용한다. `footer_from_props_lines`는 상태줄이 있으면 `vec![status_line]`을 반환한다. 다른 안내·단축키 화면이 여러 줄을 쓰는 것과 사용자 지정 여러 줄 상태줄 지원은 다르다.
5. [`bottom_pane/status_line_setup.rs`](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/tui/src/bottom_pane/status_line_setup.rs)의 항목 enum에 외부 명령·줄바꿈·사용자 지정 그래프 항목은 없다.

## 훅과 REA의 범위

공식 이벤트 훅은 입력 검사, 도구 이벤트 관찰, 컨텍스트 추가 등으로 동작한다. 훅의 stdout은 이벤트별 텍스트·JSON 계약에 따라 처리된다. 임의로 출력한 문자열을 footer의 프레임으로 취급하는 API가 아니다. MCP의 도구 응답이나 별도의 앱 UI도 기존 Codex 입력창 아래 footer 렌더러와 다르다.

기존 REA 기록은 JavaScript 실행기 분석과 네이티브 파일 식별에 해당한다. 2026-10-26의 `rea doctor --json` 확인에서는 Hopper/Ghidra/IDA 네이티브 분석 엔진이 구성되어 있지 않았다. 따라서 REA로 네이티브 HUD 콜백까지 역분석했다고 주장하지 않는다. 이번 판단의 직접 근거는 공식 문서와 해당 버전 공개 소스다. REA의 분석 기능이 호스트에 없는 플러그인 API를 만들어 주지는 않는다.

## 이후 구현에 필요한 조건

Claude HUD와 같은 구조를 구현하려면 Codex가 외부 상태줄 명령과 세션 데이터 입력 계약을 제공하고, 출력 여러 줄을 footer 레이아웃에 반영해야 한다. 입력창 구분선 변경에는 composer 렌더링 확장도 필요하다. 이 연결 지점을 Codex에 추가하는 것은 본체 수정이다.

별도 TUI나 터미널 오버레이로 유사한 화면을 만드는 방법도 검토할 수 있지만, 그것을 기존 Codex에 설치하는 HUD 플러그인과 동일하다고 소개하지 않는다. 본체 패치와 별도 UI는 구현하지 않았다.

## 설정 플러그인 전환 검증

0.2.0은 root `plugin.json`, `skills/setup`, `skills/configure`와 TOML 설정 도우미를 포함한다. 지원되지 않는 그래프·줄 수·composer 구분선 설정은 제공하지 않는다. 기존 실행기는 호환용으로 남겼으며 플러그인 실행에 필요하지 않다.

임시 `CODEX_HOME`에서 로컬 마켓플레이스 등록과 플러그인 설치·활성화를 확인했다. app-server의 `skills/list`가 두 스킬을 `codex-hud:setup`, `codex-hud:configure` 이름과 pluginId로 반환했고 오류 목록은 비어 있었다. 설치된 복사본에서 setup 도우미도 실행했다. 이 검증은 모델 턴이나 실제 사용자 환경의 전역 설치를 수행하지 않는다.

공개용 마켓플레이스 이름은 `codex-hud`로 통일했다. 설치 식별자는 `codex-hud@codex-hud`이며, 로컬 폴더와 GitHub 배포에 동일하게 사용한다.

## 공식 문서

- [플러그인 패키징](https://developers.openai.com/plugins/build/plugins)
- [Codex 이벤트 훅과 출력 계약](https://learn.chatgpt.com/docs/hooks)
- [설정 레퍼런스: `tui.status_line`](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Claude HUD의 status line command 구조](https://github.com/jarrodwatts/claude-hud#how-it-works)

확인 결과는 Codex CLI 0.164.0에 한정한다. 새 버전에서 외부 HUD API가 제공되면 다시 검토해야 한다.
