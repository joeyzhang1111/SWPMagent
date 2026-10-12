# Task Page 产品需求文档

## 1. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | SWPM Task Page 产品需求文档 |
| 文档版本 | V2.3 |
| 文档状态 | 评审基线（与当前实现对齐，包含已识别实现差异） |
| 编写日期 | 2026-10-12 |
| 适用页面 | `src/pages/TasksPage.jsx`、`src/components/analysis/*`、`src/context/AnalysisContext.jsx` |
| 适用后端 | `backend/app.py`、`analysis_service.py`、`reference_bridge.py`、`doors.py`、`qc.py`、`traceability.py`、`normalize.py` |
| 评审人 | 待填写 |

### 1.1 优先级定义

| 优先级 | 定义 |
|---|---|
| P0 | 页面核心能力，缺失则本期不可发布 |
| P1 | 重要能力，可在核心流程可用后修复或完善 |
| P2 | 优化项，不阻塞核心业务流程 |

### 1.2 需求状态说明

本文档描述 Task Page 当前的功能边界，同时作为开发和回归测试基线。“应”表示可验收要求；“待确认”表示尚未形成业务承诺，不应由开发人员自行假设。当前实现与需求之间已确认但尚未关闭的差异记录在第 12.1 节，这些差异不改变验收要求。

###
---

## 2. 背景与目标

### 2.1 背景

项目任务、系统需求、软件需求和测试执行信息分散在 ALM、DOORS 与 QC 中。用户需要分别打开多个系统才能判断当前项目有哪些工作项、需求是否完成、测试是否通过，以及 DOORS 需求是否已形成完整的 ALM 和 QC 追踪链路。

原始系统中的字段、状态和标识方式不同，数据规模较大（单个项目可达上万条需求、数千条 ALM/QC 记录）。若展示静态示例数据或未经验证的模糊关联，会导致项目判断与真实数据不一致。

### 2.2 产品目标

Task Page 应提供一个统一工作台，使用户能够：

1. 选择 Jenkins Project 和 Build，加载该 Build 的 DOORS（10_AS、40_Gen_SWXS）、ALM 迭代、QC 文件夹等可选范围。
2. 勾选分析范围，运行与参考桌面工具一致的五步分析，查看结果并导出 Excel。
3. 查看 Jenkins 最新构建状态，必要时触发一次新构建。
4. 按需展开 ALM 迭代的子迭代，使其可被选择。
5. 在 Traceability 页使用导出系统中的精确标识重建 DOORS→ALM、DOORS→QC 追踪关系，查看全部 DOORS 需求的链路状态。
6. 在切换 Tab 或页面、刷新浏览器后，不丢失已选范围、运行进度和分析结果。
7. 识别分析结果是否已过期（范围在运行后被修改）。

### 2.3 成功定义

本期完成的最低标准是：测试人员可以在不手工扫描 CSV 的情况下完成“选择项目与构建 → 加载输入 → 勾选范围 → 运行分析 → 导出结果”，并在 Traceability 页看到与分析页口径一致的 DOORS 需求总数；切换 Tab 或页面不丢状态。

---

## 3. 用户与使用场景

### 3.1 目标用户

| 用户角色 | 主要诉求 |
|---|---|
| PCM | 查看项目需求、ALM 工作项、测试的完成情况、质量问题和端到端覆盖情况 |
| 数据维护/支持人员 | 通过运行日志和接口错误信息定位 Jenkins、RTC、文件或配置问题 |

### 3.2 核心场景

1. 用户进入 Tasks 页，默认打开 Reference Analysis；页面恢复上次的项目、构建号和勾选范围（同一浏览器会话内），否则使用后端保存的上次选择。
2. 用户点击 **Refresh Jenkins** 查看最新构建状态；构建成功后自动把 Build 设为最近成功构建，并要求重新加载输入。
3. 用户点击 **Load inputs**，下载（若本地无缓存）并扫描该构建，得到 10_AS / 40_Gen_SWXS 模块和基线、ALM 迭代、QC 文件夹。
4. 用户勾选范围；对 ALM 迭代可点击 **Load sub-iterations** 向 RTC 拉取下一层子迭代。
5. 用户点击 **Run full analysis**，查看进度和日志；完成后在 Overview 和各结果表中查看问题，并可 **Export Excel**。
6. 用户修改范围后，旧结果显示“已过期”提示。
7. 用户切到 **Traceability**，按项目、基线、关键字、类别筛选，展开一条记录查看 DOORS→ALM→QC 节点和链接依据。
8. 用户离开 Tasks 页或刷新浏览器后返回，分析状态和结果仍在（后端未重启的前提下）。

---

## 4. 范围

### 4.1 本期范围内

- Reference Analysis 工作台：Jenkins 状态、Trigger build、Load inputs、范围勾选、ALM 子迭代加载、Run full analysis、进度与日志、结果表、Excel 导出。
- 分析状态跨 Tab、跨页面、刷新浏览器的保留；结果过期提示。
- Traceability 页：全部 DOORS 需求的追溯行、六类 Trace category、动态统计、筛选、分页、展开详情。
- `/api/tasks` 统一任务与追溯数据（ALM 缓存/RTC 在线、DOORS/QC Jenkins 缓存）。
- 基线字段格式清洗。
- 数据源缺失、权限失败等异常提示。

### 4.2 本期范围外

- 页面打开时自动触发 Jenkins Build 或自动运行分析。
- 同时触发多个 Jenkins Build。
- Dashboard、Baseline、SWKPI、Weekly Report、Agent Monitor、Notifications 页面（当前为示例数据，不在本文档范围）。
- Table、Kanban、Summary 视图（代码保留，未挂载，是否恢复见 DEC-006）。

---

## 5. 总体业务流程

```text
用户进入 Tasks 页（Reference Analysis）
  ├─ 首次挂载：GET /api/analysis/bootstrap
  │    ├─ 优先恢复 sessionStorage 中的项目/构建/勾选/任务 ID
  │    └─ 否则使用后端保存的 last_project / last_build / 选择
  └─ GET /api/analysis/inputs（同项目同构建命中后端缓存，不重复扫描）

Refresh Jenkins
  └─ GET /api/analysis/jenkins-status → 显示 last build / last success；Build 设为最近成功号并使已加载输入失效

Load inputs
  ├─ 本地无 {project}_{build}_ref.zip 则从 Jenkins 下载并解压
  ├─ 扫描 10_AS / 40_Gen_SWXS 模块与基线（基线值先清洗）、QC 文件夹、ALM 迭代
  └─ 已加载同一 (项目, 构建) 再次点击 → 强制重新扫描

Load sub-iterations（ALM）
  └─ POST /api/analysis/alm-children → 用已保存凭据登录 RTC，拉取一层子迭代并写回时间线缓存

Run full analysis
  ├─ POST /api/analysis/runs → 后台任务 → 前端每秒轮询 GET /api/analysis/runs/{id}
  ├─ 步骤：1 加载/扫描 → 2 10_AS → 3 40_Gen_SWXS → 4 ALM → 5 QC
  └─ 完成 → 结果表 + Export Excel；保存本次选择为该项目的默认选择

Traceability
  └─ 首次进入：GET /api/tasks（会话内缓存）→ 按 DOORS 需求逐条构建追溯行
```

---

## 6. 功能需求

### 6.1 页面结构与状态生命周期

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-INIT-001 | P0 | Tasks 页应提供 Reference Analysis 与 Traceability 两个 Tab，默认打开 Reference Analysis。 | 进入页面后第一个 Tab 处于激活状态。 |
| FR-INIT-002 | P0 | 分析状态（项目、构建、可选输入、勾选项、Jenkins 状态、任务进度、结果）应保存在页面之外的全局 Provider 中，切换 Tab 或路由不得丢失。 | 切到 Traceability 再切回、切到 Dashboard 再回到 Tasks，勾选项、进度和结果保持不变。 |
| FR-INIT-003 | P0 | 分析状态仅在首次打开分析视图时初始化；之后切回不得重复调用 `bootstrap` 和 `inputs`。 | 切换 Tab/路由后 Network 中没有新的 `/api/analysis/*` 请求；打开 Dashboard 等其他页面不触发这些请求。 |
| FR-INIT-004 | P1 | 项目、构建、勾选项、任务 ID 应保存到 `sessionStorage`（键 `swpm-analysis-session-v1`）；刷新浏览器后应恢复，并取回正在运行或已完成的任务状态与结果。 | 刷新页面后输入、进度、日志、结果、Export Excel 链接均恢复；后端重启后任务不存在时不报错，只清除任务状态。 |
| FR-INIT-005 | P1 | 任务轮询遇到“任务不存在”时应清除当前任务状态，不显示错误。 | 后端重启后刷新页面，页面回到无任务状态。 |
| FR-INIT-006 | P1 | 当前结果对应的任务 ID 应独立于当前跟踪的任务 ID 保存，Export Excel 始终指向产出当前结果的那次分析。 | 分析完成后再点 Trigger build，Export Excel 仍下载分析结果。 |

### 6.2 Jenkins 状态与构建

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-JNK-001 | P0 | 项目下拉框的选项来自后端保存的 `selection_states` 项目键；`bootstrap?refreshProjects=true` 可合并 Jenkins 在线 job 列表（当前 UI 未使用该参数）。 | 下拉框列出保存过选择的 Jenkins 项目。 |
| FR-JNK-002 | P0 | **Refresh Jenkins** 只读：查询所选项目的最近构建与最近成功构建，不得下载、不得触发构建、不得修改勾选项。 | Network 仅有 `GET /api/analysis/jenkins-status`；响应含 `last_build`、`last_status`、`last_success_build`、`last_success_time`。 |
| FR-JNK-003 | P0 | 刷新后 Build 输入框应设为最近**成功**构建号；构建仍在运行（`RUNNING`）时不得选中该运行中的构建。 | 状态为 RUNNING 时 Build 仍为最近成功号。 |
| FR-JNK-004 | P0 | Build 号变化后，已加载的输入应标记为失效（隐藏输入区并禁用 Run），必须重新 **Load inputs**。 | 修改 Build 或 Refresh 后 Run 按钮禁用，直到重新加载。 |
| FR-JNK-005 | P1 | **Trigger build** 调用 `summary_backend.trigger_and_wait`：先读旧构建号，再 POST `buildWithParameters`，最多等待 40 秒新构建号出现；完成后用返回的最近成功号更新 Build。 | `POST /api/analysis/trigger-build` 返回任务 ID，进度可见；40 秒内无新构建号时任务失败。 |
| FR-JNK-006 | P0 | Trigger build 与分析任务不得同时进行；任一运行中另一个按钮禁用。 | 运行中 Trigger build 和 Run 均禁用。 |

### 6.3 加载输入（Load inputs）

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-INP-001 | P0 | **Load inputs** 在本地缺少 `{project}_{build}_ref.zip` 时从 Jenkins 下载，解压到 `backend/.app_cache/jenkins/{project}_{build}_ref/`，并扫描 10_AS / 40_Gen_SWXS 模块、基线、QC 文件夹。 | 首次加载后出现六个多选区。 |
| FR-INP-002 | P0 | 同一 (项目, 构建) 的重复请求应直接返回后端缓存的扫描结果，不重复扫描 CSV；点击 **Load inputs** 且当前已加载同一 (项目, 构建) 时应强制重新扫描（`refresh=true`）。 | 第二次进入页面无重新扫描；点按钮后后端重新扫描。 |
| FR-INP-003 | P1 | 缓存命中的 `inputs` 请求不得等待分析任务持有的全局状态锁，页面在分析运行期间保持响应。 | 分析运行中切回页面立即显示输入。 |
| FR-INP-004 | P0 | 返回的 `selection` 为该项目上次保存的选择，只保留在新输入中仍存在的值；同一项目重新加载时应保留当前未保存的勾选（仅过滤已不存在的值）。 | 修改勾选后重新 Load inputs，勾选保留。 |
| FR-INP-005 | P0 | 换项目时清空勾选项、Jenkins 状态和输入，构建号设为该项目最新缓存构建，并忽略过期请求的响应。 | 快速连续切换项目，页面只显示最后一次选择的项目数据。 |
| FR-INP-006 | P1 | 多选框应支持关键字搜索、全选/清空可见项，显示已选/总数。 | 搜索后“Select visible”只作用于可见项。 |

### 6.4 ALM 迭代与子迭代

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-ALM-001 | P0 | ALM 迭代选项来自本地时间线缓存（`backend/.app_cache/timeline/timeline_cache.json`）中的叶子迭代，显示为 `Timeline \| 完整路径`。 | 选项数量与缓存叶子迭代一致。 |
| FR-ALM-002 | P0 | 每个叶子迭代都携带 `expandable` 标记（带有未加载子迭代链接）；鼠标悬停时显示 **Load sub-iterations**。 | 悬停选项出现按钮。 |
| FR-ALM-003 | P0 | 点击 **Load sub-iterations** 应使用已保存的 RTC 凭据登录，拉取下一层子迭代并写回时间线缓存；父节点被子迭代替换，已选的父节点自动取消勾选。 | 展开后选项列表更新；无子迭代时按钮消失，不重复请求。 |
| FR-ALM-004 | P1 | 无凭据、认证失败或 RTC 不可达时，应显示后端返回的明确错误，且重置 ALM 会话，下次重新登录。 | 页面显示错误信息。 |
| FR-ALM-005 | P0 | 选中父级迭代时只会返回直接挂在该迭代上的任务，不含子迭代任务；子迭代需单独选择。 | 参考：`BL01` 父级 0 条，其下 `SP01…` 子迭代各有任务。 |

### 6.5 运行分析与进度

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-RUN-001 | P0 | **Run full analysis** 只在输入已加载、未在加载中、无运行中任务时可用。 | 条件不满足时按钮禁用。 |
| FR-RUN-002 | P0 | 点击后 `POST /api/analysis/runs` 立即返回任务 ID；前端每秒轮询任务状态直到 `complete` 或 `failed`。 | 页面持续显示进度条、百分比、步骤 `n/5` 和消息。 |
| FR-RUN-003 | P0 | 分析流程与参考桌面工具一致：1 加载/扫描构建、2 10_AS、3 40_Gen_SWXS、4 ALM、5 QC；未选择的类别跳过并写日志。 | 日志含 `Step n/5`。 |
| FR-RUN-004 | P0 | 请求中的基线值应先做格式清洗并去重（第 7.8 节）；运行成功后，本次选择应保存为该项目的默认选择。 | 保存的选择中基线无首尾空格。 |
| FR-RUN-005 | P1 | 日志最多保留最近 500 条，失败时默认展开日志。 | 超过 500 条时最早日志被移除。 |
| FR-RUN-006 | P0 | 后台线程在启动阶段（如分析后端加载失败）失败时，任务应进入 `failed` 并给出原因，不得永久停留在 `queued/running`。 | 当前为已知差异，见 GAP-001。 |
| FR-RUN-007 | P0 | 同一后端同一时间最多 2 个任务并发；分析任务执行期间持有全局状态锁，分析之间串行。 | 第二个分析排队等待。 |

### 6.6 分析结果

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-RES-001 | P0 | 结果区应包含 Overview、10_AS、40_Gen_SWXS、ALM、QC TestInstance、QC Requirement 六个标签页，并显示各自行数。 | 标签页计数与结果一致。 |
| FR-RES-002 | P0 | Overview 显示五类总数与问题数，以及 10_AS、40_Gen_SWXS、ALM 的文字摘要。 | 数值与结果表一致。 |
| FR-RES-003 | P1 | 结果表支持关键字搜索（忽略大小写，匹配整行所有值）、“Issues only”过滤和每页 50 条分页。 | 过滤后行数和页码正确。 |
| FR-RES-004 | P0 | 存在问题的行应高亮并显示 `Issue Reason`。 | 问题行有样式。 |
| FR-RES-005 | P0 | 结果存在时应显示 **Export Excel**，下载由后端用参考工具导出的 xlsx。 | `GET /api/analysis/runs/{id}/report` 返回 xlsx；任务不存在返回 404。 |
| FR-RES-006 | P0 | 结果上方应显示“Result for 项目 · build · N ALM iterations”；当前项目、构建或任一勾选与产出结果时的请求不一致时，改为“This result is out of date…”提示。 | 修改任一勾选后提示变为过期；改回后恢复。 |
| FR-RES-007 | P1 | 过期结果仍可查看和导出，不被清除；再次点击 Run 时旧结果被清除。 | 过期状态下可导出；点击 Run 后结果区清空。 |

### 6.7 Traceability 页

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-TRC-001 | P0 | 首次进入 Traceability 时调用 `GET /api/tasks`；结果在本次浏览器会话内缓存，切回页面不重新下载；点击 **Refresh** 才以 `refresh=true` 重新读取本地 ALM/Jenkins 导出文件。 | 切换页面后无新的 `/api/tasks` 请求；Refresh 有请求。 |
| FR-TRC-002 | P0 | 只能使用第 7.6 节定义的精确标识建立链接，不得使用标题相似度或语义猜测。 | 删除精确 ID 后，标题相同也不建立链接。 |
| FR-TRC-003 | P0 | Matrix 应以**每一条 DOORS 需求**为一行（包含没有任何链接的需求），列为：DOORS Requirement、ALM Work Items、QC Requirements、QC Test Instances、Link State。 | 行数等于 DOORS 需求总数（分页前）。 |
| FR-TRC-004 | P0 | 点击一行应展开 DOORS→ALM→QC 三个 lane，并显示每条链接的 `via` 依据。 | 展开后可见 `DOORS external WorkItemID`、`QC RB_DoorsLinks`、`QC Req2Test` 等。 |
| FR-TRC-005 | P0 | ALM ID 在 DOORS export 中存在但不在已加载 ALM 数据中时，显示占位卡片 “Outside loaded ALM scopes / Exact ID exists in DOORS external export”，不得创建虚假 ALM 节点。 | 未解析 ID 显示占位卡片。 |
| FR-TRC-006 | P0 | Trace category 下拉框应提供 All requirements 与六类（第 7.7 节）；数量为 0 的类别置灰不可选；当前选中的类别在当前范围下没有记录时自动回到 All。 | 切换项目后无数据的类别置灰，选中类别自动复位。 |
| FR-TRC-007 | P0 | 顶部统计条（各类别计数）与 `End-to-end coverage` 应随项目、基线和关键字动态重算。覆盖率 = `round(End-to-end ÷ 需要追溯的需求数 × 100%)`；“需要追溯的需求数”不含 `Not required`；分母为 0 时为 0%。 | 当前真实数据：1,310 ÷ 4,072 ≈ 32%（以实际数据为准）。 |
| FR-TRC-008 | P0 | Project 下拉框只列出存在追溯行的项目；Iteration 下拉框只列出所选项目下 DOORS 需求的基线，且筛选只按 DOORS 需求的基线匹配；更换项目时清空基线筛选。 | 选择无追溯数据的 ALM 项目不再出现。 |
| FR-TRC-009 | P0 | 关键字搜索忽略大小写，匹配追溯行所有节点（DOORS、ALM、QC）的 ID、Title、Project、Iteration。 | ALM/QC 子节点命中时其 DOORS 行仍显示。 |
| FR-TRC-010 | P1 | QC Test 列显示 `Done 数 / 总数 Passed`。 | 与展开节点逐条核对一致。 |
| FR-TRC-011 | P1 | 支持分页，每页 25/50/100（默认 50），显示起止序号、总数、页码；任一筛选变化时回到第 1 页。 | 例如 `1–50 of 10,548`。 |
| FR-TRC-012 | P1 | 无任何追溯数据时显示 “No exact exported cross-source links are available.”；筛选结果为 0 时显示空状态且筛选控件保留。 | 空状态文案出现。 |

### 6.8 `/api/tasks` 接口

| ID | 优先级 | 需求 | 可验证结果 |
|---|---|---|---|
| FR-API-001 | P0 | `GET /api/tasks` 返回 `tasks`、`traceability`、`meta`；ALM 来自 `SWPM_TASK_DATA_MODE`（`auto`/`legacy-cache`/`live`），DOORS 与 QC 来自 Jenkins 缓存和保存的选择。 | 三类来源的记录均出现在 `tasks`，`meta.sourceCounts` 给出各来源数量。 |
| FR-API-002 | P0 | 响应默认缓存 5 分钟（`RTC_ALM_CACHE_TTL_SECONDS`），缓存键含 ALM 缓存文件与配置文件的修改时间；`refresh=true` 绕过缓存并重新解析。 | 修改配置文件后下次请求重新解析。 |
| FR-API-003 | P0 | DOORS/QC 派生缓存（`backend/.cache/*.json`）的指纹应包含：选中的文件及其大小/修改时间、配置文件、最大记录数、清洗规则版本。 | 任一变化后派生缓存重建。 |
| FR-API-004 | P1 | 某数据源加载失败时，其他来源继续，`meta.sourceErrors` 记录失败原因；DOORS/QC 单来源默认最多解析 50,000 条，超限时 `meta.truncated=true`。 | 构造缺失文件后出现 sourceErrors。 |
| FR-API-005 | P1 | 错误返回明确状态码：400 缺参数、404 任务/报告不存在、502 外部系统失败、503 配置错误。 | 覆盖各状态码。 |

---

## 7. 数据来源与业务规则

### 7.1 数据新鲜度与缓存规则

| 数据 | 规则 | 说明 |
|---|---|---|
| Jenkins 状态 | 每次 Refresh Jenkins 实时查询 | 只读 |
| Jenkins Artifact | 本地存在 `{project}_{build}_ref.zip` 则复用，否则下载；解压目录非空则不重复解压 | 保留旧构建，不清理 |
| 输入扫描结果 | 后端按 (项目, 构建) 缓存；`refresh=true` 才重新扫描 | 扫描会将 ALM 缓存标记为“下一次运行强制重拉” |
| ALM 数据（分析页） | `summary_backend.fetch_alm`：默认读 ALM 缓存，构建重新扫描后的第一次运行强制向 RTC 重拉 | 需要已保存 RTC 凭据 |
| ALM 时间线 | 本地缓存；子迭代只能通过 **Load sub-iterations** 向 RTC 补充 | 与参考桌面工具的懒加载一致 |
| ALM 数据（Traceability） | 读取本地 ALM 缓存文件（`SWPM_LEGACY_ALM_CACHE`）或在线 RTC（live 模式） | Refresh 只重读本地文件，不向远端导出 |
| DOORS/QC（Traceability） | 读取 `SWPM_LEGACY_JENKINS_ROOT` 下各项目最新的 `*_ref` 目录，按保存的选择过滤 | 最新目录以目录修改时间判断 |

### 7.2 选择范围

| 来源 | 范围配置 |
|---|---|
| ALM | 所选项目保存的 `alm_scope_displays`（叶子迭代） |
| DOORS | 所选项目的 `10_AS`：`as_file_names + as_features`，`40_Gen_SWXS`：`xs_file_names + xs_features` |
| QC | 所选项目的 `qc_paths`，按前缀匹配 TestSet 文件夹路径；QC Requirement 只取基线匹配且 `Requirement_Type=105` 的记录 |

### 7.3 统一任务字段

| 字段 | 含义 |
|---|---|
| `key` | 全局唯一渲染键（DOORS 含项目、类别、模块、对象 ID、基线） |
| `id` | 标准化 ID：`ALM-*`、`DOORS-*`、`QC-TI-*`、`QC-REQ-*` |
| `source` | `ALM`、`DOORS`、`QC` |
| `type` | 类型标准化结果；DOORS：Requirement（10_AS）/SW Requirement（40_Gen_SWXS）；QC：Test Instance/QC Requirement |
| `title`、`project`、`component`、`module`、`assignee`、`due` | 来源字段；缺失负责人为 Unassigned；`due` 为 `YYYY-MM-DD` 或空 |
| `iteration` | ALM 为“项目 / 迭代路径”；DOORS/QC 为清洗后的基线（空基线 DOORS 为 `<EMPTY>`，QC 为 `Unassigned baseline`） |
| `status` / `rawState` | 标准状态（To Do / In Progress / In Review / Done）/ 来源原始状态 |
| `issueReason` | 按来源规则生成的问题说明 |
| `linkedAlmIds`（DOORS）、`doorsIds`（QC Test）、`doorsIdentifier`、`linkedTestIds`（QC Requirement） | 追溯用精确标识 |

### 7.4 状态映射（当前实现）

| 来源 | 规则 |
|---|---|
| ALM | State 含 closed/resolved/verified/done/complete → Done；含 review/approve/validate → In Review；含 progress/started/implement/active → In Progress；其他 → To Do（子串匹配，见 GAP-005） |
| DOORS | accepted、validated、passed、ok、no_req、rejected、canceled → Done；accepted_w_rem、in review、review、reviewed → In Review；in progress、analyzed、analysis、implemented → In Progress；其他 → To Do（`in_analysis` 目前落入 To Do，见 GAP-005） |
| QC | Passed → Done；In Progress、Running、Executing → In Progress；Failed、Blocked、Not Completed → In Review；其他 → To Do |

### 7.5 来源解析和质量规则

- **ALM**：`ID` 补充 `ALM-` 前缀；Epic→`EPIC`，含 Story→`Story`，Task/Work Task→`Task`；Priority 由 Severity 映射；不推导 `issueReason`。
- **DOORS**：
  - 10_AS 质量问题：分析未完成、Rejected 未获客户同意、Change Required 缺失、FNID 缺失、Baseline 缺失。
  - 40_Gen_SWXS 在 Accepted/Validated 时检查：Test Status 是否 Passed、Review Status 是否 OK、是否链接 Story。
  - 有问题时 Priority=High。
- **QC**：Test Instance 状态不是 Passed 且 `RB_Comment` 为空时产生 `issueReason`；QC Requirement 的 Direct Cover Status 不是 Passed 时产生 `issueReason`；与 `QC_Req2Test.csv` 的 `REQ_ID`+`TEST_ID` 关联。

### 7.6 精确 Traceability 规则

| 链接 | 精确字段/文件 | 说明 |
|---|---|---|
| DOORS→ALM | DOORS external CSV 的 `WorkItemID`；缺失时取 `Target_URL` 末尾数字 | 标准化为 `ALM-*` 后与已加载 ALM ID 精确比较；找不到则记为 unresolved |
| QC Test Instance→DOORS | `RB_DoorsLinks`（分号分隔） | 按 项目+DOORS ID 优先；仅当全局唯一时允许跨项目回退 |
| QC Requirement→DOORS | `RB_Doors_Identifier` | 同上 |
| QC Requirement→QC Test | `QC_Req2Test.csv` | 仅链接已选范围内的 Test Instance |

DOORS 的 `Object_Identifier` 在不同模块中可能重复（如模板占位符 ID），追溯行以 `key` 区分；ALM 同 ID 多候选时优先同项目，否则取第一个。

### 7.7 Trace category 定义

对每一条 DOORS 需求，按以下顺序判定：

| Category | 判定条件 | Link State |
|---|---|---|
| Not required | 原始状态（不分大小写）为 `no_req`、`rejected`、`canceled`；无论是否有链接 | Not required（灰色） |
| End-to-end | 有已加载 ALM 节点且有至少一个 QC Requirement/Test 节点 | End-to-end；QC 节点有问题时为 warn，否则 ok |
| DOORS→ALM only | 有已加载 ALM 节点，无 QC 节点 | Partial（warn） |
| DOORS→QC only | 有 QC 节点，无已加载 ALM 节点（即使存在 unresolved ALM ID） | Partial（warn） |
| Unresolved ALM only | 无已加载 ALM/QC 节点，但存在 unresolved ALM ID | Unresolved（bad） |
| No link | 以上均不满足 | No link（bad） |

meta 字段：`requirementCount`（不含 Not required）、`notRequiredCount`、`unlinkedCount`、`linkedDoorCount`（有链接的需求数）、各类别计数、`unresolvedAlmReferences`、`unresolvedDoorsReferences`。

### 7.8 基线字段格式清洗

函数 `normalize_baseline()`（`backend/normalize.py`，版本号 `NORMALIZER_VERSION`），只做格式清洗，不做语义合并：

1. 空值（None、NaN）→ 空字符串。
2. Unicode NFKC 规范化（全角→半角，不间断空格→普通空格）。
3. 删除零宽及不可见字符（U+200B–U+200D、U+2060、U+FEFF、U+00AD）。
4. 制表符、回车、换行及连续空白压缩为单个空格，去首尾空格。
5. 结果为空 → 视为“无基线”，对应 `<EMPTY>`。

明确不做：不改大小写、不删内部空格、不拆分 `&` / `;` / `,`、不去前缀、不合并 `BL3.06`/`BL3.0.6`/`BL 1.2` 等近似写法。

应用位置：
- Traceability（`doors.py`、`qc.py`）：匹配、显示、选择列表；QC 从路径提取基线时额外去掉末尾的点。
- 分析页：桥接层包装 `summary_backend.read_dumpdoors_csv`，读取后清洗 `RB_Baseline` 列；保存的选择和请求中的基线同样清洗并去重。该函数缺失时必须在加载阶段报错。
- 被清洗的值记录在 DOORS 数据的 `meta.baselineNormalized`（模块、原值、新值、行数）。
- DOORS/QC 派生缓存指纹包含清洗规则版本。

---

## 8. 异常和边界情况

| ID | 场景 | 系统响应 | 验收要求 |
|---|---|---|---|
| EX-001 | `bootstrap`/`inputs` 失败（配置缺失、下载失败） | 页面显示后端返回的错误；保留已有状态 | 不崩溃，可重试 |
| EX-002 | Jenkins 凭据（`JENKINS_USER`/`JENKINS_TOKEN`）未配置或被拒绝 | 后端启动时记录警告；Jenkins 相关接口返回 502 并带 Jenkins 错误信息 | 页面显示错误，不崩溃；不得回退到任何内置凭据 |
| EX-003 | Jenkins 没有最近成功构建或没有 `*_ref.zip` | 加载输入失败，提示 `*_ref.zip not found` | 不使用其他构建的数据 |
| EX-004 | RTC 凭据缺失或认证失败 | 分析第 4 步或 Load sub-iterations 失败，显示登录错误 | 不得显示为成功拉取 |
| EX-005 | 选中的 ALM 迭代没有任务（如父级节点） | 当前页面无专门提示（GAP-003） | 后续应提示“所选迭代无任务” |
| EX-006 | 分析任务失败 | 任务 `failed`，显示错误和日志；保留上一次结果以外的状态 | 页面可再次运行 |
| EX-007 | 后端重启 | 内存中的任务与结果丢失，页面刷新后回到无任务状态；勾选和项目仍保留 | 不报错 |
| EX-008 | 某数据源在 `/api/tasks` 中不可用 | `meta.sourceErrors` 记录，其他来源继续（Traceability 页目前不展示，见 GAP-006） | 不影响其他来源 |
| EX-009 | 筛选结果为 0 | 显示空状态，筛选控件保留 | 无需刷新即可取消筛选 |
| EX-010 | 同一时间已有分析/Jenkins 任务运行 | Run 与 Trigger build 禁用 | 不得并发启动 |
| EX-011 | 构建正在进行（`RUNNING`） | Build 保持最近成功号，不选中运行中的构建 | 状态徽标显示 RUNNING |
| EX-012 | 任务数超过来源上限 | 按上限截断并 `meta.truncated=true` | UI 暂无提示（DEC-004） |

---

## 9. 非功能需求

### 9.1 性能与容量

| ID | 优先级 | 需求 | 验收方式 |
|---|---|---|---|
| NFR-PERF-001 | P0 | Traceability 与结果表通过分页渲染，默认每页 50 条，不得一次渲染全部行。 | 约 1 万行追溯数据下页面可操作，DOM 行数受分页限制。 |
| NFR-PERF-002 | P0 | 长时间分析不得以同步请求阻塞页面；缓存命中的 `inputs` 请求不得被分析任务阻塞。 | 分析运行期间可切换页面、切回后输入即时显示。 |
| NFR-PERF-003 | P1 | `/api/tasks` 冷启动当前约 8 秒、响应约 32 MB（约 2.1 万条任务 + 1 万追溯行）；Traceability 数据应在会话内缓存。 | 切回页面不重复下载。 |
| NFR-PERF-004 | 待确认 | 端到端耗时依赖 Jenkins/RTC 和数据规模，本期不承诺固定 SLA。 | 业务方确认后补充指标。 |

### 9.2 安全

| ID | 优先级 | 需求 | 验收方式 |
|---|---|---|---|
| NFR-SEC-001 | P0 | Jenkins/RTC 用户名、密码、token、session 和 credential 文件不得发送到浏览器。 | 检查 API 响应与前端状态。 |
| NFR-SEC-002 | P0 | 日志不得打印密码或认证 header。 | 搜索前后端日志。 |
| NFR-SEC-003 | P0 | 含凭据的文件（`backend/.env`、`.envbackup`、`backend/.app_cache/cred/`）不得被提交到版本库。 | `.gitignore` 覆盖这些路径（当前未覆盖，见 GAP-008）。 |
| NFR-SEC-004 | P1 | RTC 在线模式 TLS 校验保持启用并可配置 CA bundle；Jenkins 连接的 TLS 校验应默认启用。 | 当前 Jenkins 默认关闭校验，见 GAP-007。 |
| NFR-SEC-005 | P1 | 触发 Jenkins Build 属于外部写操作，应在界面上要求用户确认。 | 当前无确认框，见 GAP-002。 |

### 9.3 可靠性和一致性

| ID | 优先级 | 需求 | 验收方式 |
|---|---|---|---|
| NFR-REL-001 | P0 | 分析页与 Traceability 页对同一项目、同一选择应得到相同的 DOORS 需求数。 | BAW212 保存的选择：10_AS 5,771 + 40_Gen_SWXS 4,771 = 10,542，两处一致。 |
| NFR-REL-002 | P0 | 基线清洗规则变更后，DOORS/QC 派生缓存必须重建。 | 修改版本号后缓存指纹变化。 |
| NFR-REL-003 | P0 | 切换项目时旧请求的响应不得覆盖新项目的状态。 | 快速切换项目后页面只显示最后一个项目的数据。 |
| NFR-REL-004 | P1 | API 错误返回明确 HTTP 状态及可读 detail。 | 覆盖 400、404、502、503。 |

### 9.4 架构

| ID | 优先级 | 需求 | 验收方式 |
|---|---|---|---|
| NFR-ARCH-001 | P0 | 分析页的 Jenkins/DOORS/ALM/QC 解析逻辑位于本仓库 `backend/summary_backend.py`，由桥接层按模块名 `backend.summary_backend` 加载；运行时不得依赖仓库外的代码、路径或环境变量指向的外部文件。 | 将外部参考项目目录移走后，Project 列表、Load inputs、Run analysis 仍可运行；代码和文档中无外部绝对路径。 |
| NFR-ARCH-002 | P0 | `summary_backend.py` 不得包含任何硬编码凭据；Jenkins 用户名和 token 只能来自 `JENKINS_USER`/`JENKINS_TOKEN`（`backend/.env`）。桥接层在加载后覆盖其运行时配置（缓存目录指向 `backend/.app_cache` 或 `SWPM_ANALYSIS_CACHE_DIR`）并包装 `read_dumpdoors_csv`。 | 自动化测试检查源码中凭据默认值为空；缺少环境变量时启动日志有警告。 |
| NFR-ARCH-003 | P1 | SWPM 运行数据存放在 `backend/.app_cache`（或 `SWPM_ANALYSIS_CACHE_DIR`），派生缓存存放在 `backend/.cache`。 | 路径检查。 |

### 9.5 易用性

| ID | 优先级 | 需求 | 验收方式 |
|---|---|---|---|
| NFR-UX-001 | P1 | 主要下拉框和按钮应有可识别的 aria-label 或文字。 | accessibility tree 检查。 |
| NFR-UX-002 | P1 | 状态、来源和问题不能只依赖颜色，必须同时显示文字。 | 灰度检查。 |

---

## 10. 验收标准

### AC-01 状态不随导航丢失

- Given 已加载输入并修改勾选
- When 切换到 Traceability 再切回；再切到 Dashboard 再回到 Tasks
- Then 项目、构建、勾选项、进度和结果保持不变
- And 这两次切换都没有新的 `/api/analysis/*` 请求
- And 打开 Dashboard 时没有 `/api/analysis/*` 请求

### AC-02 刷新浏览器恢复

- Given 已运行完一次分析
- When 刷新浏览器
- Then 项目、构建、勾选项、运行日志、结果和 Export Excel 链接恢复
- And 后端重启后刷新，页面回到无任务状态且不报错

### AC-03 结果过期提示

- Given 一次分析已完成
- When 修改任一勾选、构建或项目
- Then 结果上方变为“out of date”提示，结果仍可查看与导出
- And 改回原值后提示恢复为 “Result for …”
- And 再次点击 Run 后旧结果清除

### AC-04 输入缓存

- Given 已加载某 (项目, 构建) 的输入
- When 再次进入该页面
- Then 后端不重新扫描 CSV
- When 点击 Load inputs
- Then 后端重新扫描
- And 分析运行期间，缓存命中的 `inputs` 请求立即返回

### AC-05 Jenkins 状态

- Given 最近构建正在运行
- When 点击 Refresh Jenkins
- Then 显示 `RUNNING` 与最近成功构建号，Build 保持最近成功号，输入被标记失效
- And Network 中仅有 `GET /api/analysis/jenkins-status`

### AC-06 ALM 子迭代

- Given 所选迭代是缓存中只有根节点的父级迭代
- When 点击 Load sub-iterations
- Then 子迭代出现并可选，父节点被替换且取消勾选
- And 无子迭代时按钮消失
- And 无凭据时显示明确错误

### AC-07 基线清洗一致性

- Given BAW212 保存的选择，其中模块 `SWFS_0225_BOOT_SWCS_SPEC` 的基线原值为 `' BL04'`
- When 分别查看分析页结果和 Traceability
- Then 两处的 40_Gen_SWXS 行数均包含这 105 行，合计 10_AS + 40_Gen_SWXS 一致
- And `meta.baselineNormalized` 记录 `' BL04' → 'BL04'`，105 行

### AC-08 Traceability 行集合与分类

- Given 构造五条 DOORS 记录：有 ALM+QC、仅 ALM、仅 QC、仅未解析 ALM、无任何链接，以及状态为 `no_req` 的需求
- When 重建 Traceability
- Then 每条需求进入且只进入一个类别（End-to-end / DOORS→ALM only / DOORS→QC only / Unresolved ALM only / No link / Not required）
- And 行数等于 DOORS 需求数
- And 标题相同但无精确 ID 的记录不建立链接

### AC-09 筛选与统计

- Given 已加载 Traceability
- When 选择项目、基线、关键字或类别
- Then 各类别计数、总数和覆盖率只基于当前范围重算
- And 无记录的类别置灰，已选类别无记录时自动回到 All
- And 项目下拉框只含有追溯行的项目，基线下拉框只含该项目的 DOORS 基线

### AC-10 Traceability 数据缓存

- Given 已打开过 Traceability
- When 切换页面再回来
- Then 不重新请求 `/api/tasks`
- When 点击 Refresh
- Then 以 `refresh=true` 重新请求

### AC-11 分页

- Given 筛选后结果超过 100 条
- When 选择 25、50、100 Rows 并翻页
- Then 每页条数、起止序号、总数、按钮禁用状态正确

### AC-12 数据安全

- Given 完成一次成功和一次失败的操作
- Then 浏览器响应、页面和日志中不存在 Jenkins/RTC 密码、token、cookie 或认证 header

---

## 11. 依赖和发布前置条件

| 依赖 | 前置条件 | 影响 |
|---|---|---|
| 分析后端 `backend/summary_backend.py` | 随仓库提供；需 `pandas`、`requests`、`openpyxl` 等依赖（见 `backend/requirements.txt`）；Jenkins 凭据通过 `JENKINS_USER`/`JENKINS_TOKEN` 提供 | 分析页全部功能 |
| Jenkins | 网络可达；账号可查询 job、Build、Artifact，并可触发 `buildWithParameters` | 状态、Load inputs、Trigger build |
| Jenkins Artifact | 构建包含一个 `*_ref.zip`，目录/CSV 结构与解析器兼容 | DOORS、QC |
| RTC/ALM | 有效凭据文件（`backend/.app_cache/cred/rtc_cred.bin`）；账号有权访问所选迭代 | ALM 步骤、子迭代加载 |
| 本地配置 | `backend/.app_cache/config/config.json` 保存各项目的选择；`backend/.env` 配置 `SWPM_LEGACY_*` 等 | Traceability 与默认选择 |
| 环境变量 | `SWPM_TASK_DATA_MODE`、`SWPM_LEGACY_ALM_CACHE`、`SWPM_LEGACY_JENKINS_ROOT`、`SWPM_LEGACY_CONFIG`、`SWPM_DOORS_ENABLED`、`SWPM_QC_ENABLED`、`RTC_ALM_*`、`JENKINS_*`、`SWPM_ANALYSIS_CACHE_DIR`、`SWPM_API_PORT`、`SWPM_CORS_ORIGINS` | 后端启动与数据范围 |

发布前须至少使用一个已配置项目完成：一次完整分析、一次输入缓存命中、一次切换页面恢复状态、一次 Traceability 加载；Trigger build 只在授权的测试 Job 上验证。

---

## 12. 已知限制与待决策项

| ID | 项目 | 当前状态 | 需要的决策 |
|---|---|---|---|
| DEC-001 | 参考后端依赖 | **已关闭**：已将参考后端并入 `backend/summary_backend.py`，不再依赖外部路径，并移除内置的 Jenkins 凭据默认值 | 无 |
| DEC-002 | 性能 SLA | 未承诺固定时间 | 基于目标环境确定指标 |
| DEC-003 | 分析完成提醒 | 未实现（已决定本期不做） | 是否增加 toast 与侧边栏标记 |
| DEC-004 | Truncated UI 提示 | 后端 meta 有标记，页面无提示 | 是否升为 P0 |
| DEC-005 | 任务/结果持久化 | 仅后端内存，重启丢失（已决定本期不做） | 是否落盘及保留期 |
| DEC-006 | Table/Kanban/Summary 视图 | 代码保留未挂载 | 恢复或删除 |
| DEC-007 | 复合基线（如 `BL2.1 & BL3.12`） | 作为独立基线值，不拆分 | 是否拆分为多个基线（会改变行数口径） |
| DEC-008 | 近似基线写法（`BL3.06`/`BL3.0.6`、`BL 1.2`/`BL1.2`、`AeroHT_BL1.1`/`BL1.1`） | 不自动合并 | 是否提供别名配置 |
| DEC-009 | DOORS 的 20_RS 等模块未加载 | QC 测试大量引用这些模块，约 94% 的 QC→DOORS 引用无法解析 | 是否扩展加载范围，或在页面提示未加载模块 |
| DEC-010 | `no_req`/`rejected`/`canceled` 在状态映射中为 Done | 影响任务完成统计 | 是否改为独立状态 |

### 12.1 已识别实现差异

下列项目是当前实现尚未满足需求基线的已知差异，应通过代码修复关闭，不得通过降低需求规避：

| ID | 对应需求 | 当前实现差异 | 期望处理 |
|---|---|---|---|
| GAP-001 | FR-RUN-006 | 后台线程在 `_ensure_backend()` 失败时任务状态永远停留在 `queued`；`_jobs`/`_results` 永不清理 | 把启动阶段放入异常处理；增加清理策略 |
| GAP-002 | NFR-SEC-005 | Trigger build 没有确认提示，也不能取消 | 增加确认框，视需要增加取消 |
| GAP-003 | EX-005 | 所选 ALM 迭代返回 0 条时没有提示 | 提示“所选迭代无任务，可能选到了父级节点” |
| GAP-004 | FR-TRC-003、7.6 | QC Requirement→DOORS 的追溯链接在真实数据中为 0（`RB_Doors_Identifier` 在 `Requirement_Type=105` 的记录中为空）；QC 的负责人和到期日大量为空 | 对照参考工具核对过滤规则和字段映射 |
| GAP-005 | 7.4 | ALM 状态为子串匹配（`Incomplete`→Done、`Not Done`→Done）；DOORS `in_analysis` 未映射 | 改为精确匹配并补充映射 |
| GAP-006 | EX-008 | Traceability 页不显示 `meta.sourceErrors`，数据源失败时只看到空状态 | 在页面顶部展示数据源告警 |
| GAP-007 | NFR-SEC-004 | `summary_backend.py` 的 Jenkins 请求 `verify=False`，桥接层 `JENKINS_VERIFY_SSL` 默认也为关闭 | 默认启用校验并支持 CA bundle |
| GAP-008 | NFR-SEC-003 | `.gitignore` 未覆盖 `backend/.envbackup`（含 Jenkins token）和 `backend/.app_cache/`（含 RTC 凭据，约 3 GB） | 加入忽略规则 |
| GAP-009 | FR-INP-004 | 缓存构建列表排序使非数字构建排在最前，默认选中的可能不是最新构建 | 修正排序 |
| GAP-010 | FR-TRC-003 | 同一 DOORS 对象 ID 在多个模块中重复时，矩阵行只显示 ID 和标题，无法区分模块 | 在行和展开详情中显示模块 |
| GAP-011 | FR-ALM-002 | 所有叶子迭代都显示 Load sub-iterations（RTC 对每个迭代都返回子迭代链接，无法预知是否有子项） | 记录已确认“无子项”的迭代，或改为批量探测 |
| GAP-012 | 7.8 | `summary_backend.py` 中 QC 需求的基线比较（`req_df["RB_Baseline"].isin`）不在清洗范围内 | 统一清洗 QC 基线列 |
| GAP-013 | NFR-PERF-003 | `/api/tasks` 一次性返回约 32 MB，Traceability 仅需其中追溯数据 | 拆分专用追溯接口或服务端分页 |
| GAP-014 | NFR-SEC | 后端 API 无鉴权，仅绑定 127.0.0.1 | 如需远程访问需增加鉴权 |
| GAP-015 | NFR-SEC-001 | RTC 凭据文件 `rtc_cred.bin` 仅用 base64 编码保存，并非加密 | 改用系统凭据库或加密存储 |

---

## 13. 需求—测试追踪矩阵

| 需求组 | 主要验收用例 |
|---|---|
| FR-INIT-* | AC-01、AC-02 |
| FR-JNK-* | AC-05 |
| FR-INP-* | AC-01、AC-04 |
| FR-ALM-* | AC-06 |
| FR-RUN-* | AC-02、AC-07 |
| FR-RES-* | AC-03 |
| FR-TRC-* | AC-08、AC-09、AC-10、AC-11 |
| FR-API-* | AC-07、AC-10 |
| NFR-SEC-* | AC-12 |
| NFR-REL-* | AC-01、AC-07 |
| NFR-PERF-* | AC-10、AC-11 |

---

## 14. 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|---|---|---|---|
| V1.0 | 2026-10-08 | 根据当时 Task Page、Pull、ALM/DOORS/QC 解析、Traceability、筛选和进度功能建立可测试需求基线 | Codex |
| V1.1 | 2026-10-09 | 新增 Trigger Build & Pull、确认、轮询、成功后自动 Pull、异常与验收要求 | Codex |
| V1.2 | 2026-10-09 | 明确未配置项目的 DOORS/QC 自动发现与 ALM skipped 行为；补充取消；记录实现差异 | Codex |
| V2.0 | 2026-10-12 | 与当前实现对齐：改为 Reference Analysis + Traceability 两个 Tab；新增分析状态跨导航与刷新保留、结果过期提示、输入缓存、ALM 子迭代加载、基线格式清洗；Traceability 改为覆盖全部 DOORS 需求并新增 No link / Not required 类别、覆盖率口径调整、项目与基线筛选口径调整；改为复用参考后端；重写异常、验收和差异清单 | GitHub Copilot |
| V2.1 | 2026-10-12 | 分析后端并入本仓库 `backend/summary_backend.py`，移除对外部参考项目路径和 `SWPM_REFERENCE_BACKEND` 的依赖；移除内置的 Jenkins 用户名/token 默认值，改为必须从 `JENKINS_USER`/`JENKINS_TOKEN` 提供；关闭 DEC-001；新增 GAP-015 | GitHub Copilot |
| V2.2 | 2026-10-12 | 新增 7.9，说明 Quality 列的计算方式和边界；新增 GAP-016 | GitHub Copilot |
| V2.3 | 2026-10-12 | 删除追溯页的 Quality 列，并移除对应的 7.9 与 GAP-016 | GitHub Copilot |
