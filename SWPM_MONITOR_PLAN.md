# SWPM 多 Agent 监控看板后续开发计划

编制日期：2026-09-21。此文档是开发计划，不代表已接入在线系统或已完成监控功能。

## 1. 当前基线与目标

目标是让 Hermes 的采集、质量、展示三个 Agent 驱动**可复现的程序**，把同一项目／构建／基线的 DOORS、QC、ALM 数据变成有证据的风险事件，再由后端 API 提供给 React 看板。第一版只读，不触发 Jenkins 构建、不修改 ALM、不发送邮件或 Teams 消息。

已完成：`swpm-monitor` 看板中的三张 DRY RUN 任务均为 Done，依赖顺序“采集 → 质量 → 展示”已验证。其完成摘要明确说明没有连接数据源、没有生成 `snapshot_id`、没有运行规则，也没有更新真实看板。当前 `src/pages/AgentMonitorPage.jsx` 的任务、进度、质量列表以及在线状态／检查数量仍是静态常量；项目只有 Vite/React 前端，没有监控后端。

旧项目 `C:\Users\JAO5SZH\Desktop\DAQ\python_Jenkins _door_QC_ALM_GUI` 已具备可参考的实现：

| 代码位置 | 可复用的知识 | 不应直接复用的部分 |
| --- | --- | --- |
| `step7_ALM.py:151-203, 3056-3088` | Jenkins 构建查询、`*_ref.zip` 定位、`Reference` 目录扫描 | GUI/网络调用混杂；原实现会解压并清理旧缓存 (`:3078-3109`) |
| `step7_ALM.py:207-534, 3259-3313` | DOORS `10_AS`、`40_Gen_SWXS` 的字段、链接索引和质量规则 | 规则目前与 pandas、GUI 状态及元组输出耦合 |
| `step0_QC.py:883-1005, 1005-1112` | QC `TestInstances`、`Requirements` 的解析、筛选和异常条件 | 导入 `step7_ALM`、依赖 Tkinter 控件；不能作为无头服务直接调用 |
| `Step0_ALM_Analysis.py:1175-1324` | 按 iteration 查询缺陷、字段规范化、ALM QC 判断 | 在线查询成本高，且旧网络代码多处 `verify=False` |
| `step7_ALM.py:132-145, 3570-3625` | `alm_cache.json` 的缓存结构与按 ID 去重逻辑 | 缓存是派生结果，没有逐条采集时间和完整性保证 |

本机 `.app_cache/jenkins` 中有按项目、构建号分组的 ZIP 和解压后的 `Reference`，其中含 DOORS/QC/TR CSV；`.app_cache/alm/alm_cache.json` 是有效 JSON，按 9 个项目／基线 scope 保存 `all_defects`、`qc_issues` 和 `data_text`。刚检查的 `ALKS_ModelM_IB_Platform_54_ref` 有 DOORS/QC 数据，却没有对应 ALM scope；AeroHT 等项目在两侧都有同名线索，但**构建与 ALM 基线的对应关系尚未验证**。不得仅凭名称拼接成同一快照。

PPS 文档仓库 `C:\Users\JAO5SZH\Desktop\agent\pipeline\skills-pipeline-platform-scripts` 描述的是 CLI 用法，不是数据服务。本机检查时 `pps`、`uv` 均未在 PATH；文档命令映射基于 PPS `v0.6.62`，上线前必须以实际安装版 `pps --help` 核对。PPS 可用于 Jenkins 构建查询与文件下载；`pps alm get-workitem-info` 只能按 ID 读工单，不能直接替代旧程序的“按 iteration 批量查询缺陷”。当前文档未提供专用 DOORS/QC 读取命令，导出 CSV 的解析仍需自行实现。

## 2. 目标架构与责任边界

```text
离线 Reference / ALM 缓存 ── 第一阶段
             │
PPS Jenkins 只读查询/下载 ── 后续接入
             │
             ▼
采集程序（校验、解析、标准化）→ 持久化 Snapshot + Manifest
             ▼
质量程序（版本化确定性规则）→ RiskEvent + Evidence
             ▼
展示程序（投影/写入本地库）→ 只读 API → AgentMonitorPage.jsx

Hermes：依次调度 swpmcollector → swpmquality → swpmdisplay，
       只传 run_id、产物路径、状态摘要，不让模型凭空推断事实。
```

三种状态必须分开：**运行状态**（任务是否完成）、**数据状态**（来源是否完整／新鲜）、**业务风险**（规则是否命中）。Agent Done 不等于数据完整；缺失来源不能显示为“0 风险”。

建议后端放在本仓库新的 `backend/` Python 包中；原始导出物和运行产物放在仓库外的受控持久目录，不使用 Hermes 的临时 scratch 工作区保存证据。React 只访问后端 API，不直接读取 `.app_cache`，展示 Agent 也不直接修改 JSX 源码。

## 3. 分阶段实施

| 阶段 | 工作内容 | 交付物与验收 |
| --- | --- | --- |
| P0：确定试点数据（先做） | 选定一个项目、一个 Jenkins 构建、对应 DOORS/QC 导出和一个 ALM scope；人工核对项目／基线映射；确认授权、脱敏和缓存时间。优先考虑两侧都有数据的 AeroHT，但必须先核实 `build 33` 是否对应 ALM `BL4.0`。 | 一份不含凭据的 `pilot.yaml`（路径、项目、构建、基线、ALM scope）；不匹配则标记 `unmatched`，不启动跨源规则。 |
| P1：离线采集 MVP | 新建只读文件适配器：扫描 `Reference`，识别 DOORS 的 `\|` 分隔和 QC 的 `;` 分隔，校验必需文件/列、编码、大小及 ZIP 与解压目录一致性；读取 ALM JSON 的选定 scope。不要导入旧 GUI 模块。 | `collect --config pilot.yaml` 生成 `snapshot.json` 和 `manifest.json`；包含各来源状态、文件 SHA-256、缓存修改时间、解析行数、错误清单。输入不被改动。 |
| P2：规则引擎 | 从旧代码提取纯函数并逐条核对业务含义。首批规则：AS 状态／客户同意／FNID／基线／XS 或 ALM 链接；XS 测试、评审、Story 链接；QC 非 Passed 且无备注、需求覆盖状态；ALM 未关闭或缺少批准。 | `evaluate --snapshot <id>` 生成稳定的 `events.json`；每条事件含 `rule_id`、规则版本、实体 ID、严重程度、证据定位和 `snapshot_id`。使用匿名小样本做单元／回归测试。 |
| P3：持久化、API、前端 | 用 SQLite 保存运行、快照、事件和证据索引；实现只读 `/api/monitor/summary`、`/api/monitor/events`、`/api/monitor/runs`、`/api/monitor/evidence/{id}`；React 改为请求 API。 | 三个面板显示真实事件及来源/更新时间；加载、空数据、来源不完整、API 故障有不同 UI；计数与事件列表一致。 |
| P4：Hermes 正式编排 | 为三个现有 profile 提供范围受限的本地工具／命令入口；新建正式任务链，不重用 DRY RUN 卡。采集 Agent 调用采集程序，质量 Agent 只消费成功快照，展示 Agent 只消费事件并刷新投影。 | 手动 `dispatch --max 1` 可端到端完成；父任务摘要只传可核验的 ID/路径；失败时阻塞子任务；重复运行不重复产生相同事件。通过后再考虑启动 Gateway 自动调度。 |
| P5：PPS 在线采集 | 安装并核对实际 PPS 版本、网络、keyring。以只读方式使用 `jenkins get-last-build-number` / `get-job-build-info` / `download-file` 下载固定构建的 `_ref.zip`；必要时用 `alm get-workitem-info` 按已知 ID 补充字段。DOORS/QC 继续从导出物解析；ALM 批量刷新需另做获授权的 RTC/ALM 读取适配器。 | 在线与离线输入生成同一数据契约；校验退出码、ZIP 格式、构建号、哈希及预期文件结构；失败文件绝不入库。 |
| P6：通知与项目写回（另行授权） | 评估 Teams、Outlook、SharePoint、T&R 的推送／创建任务；设去重、人工审批、回滚和审计。 | MVP 默认关闭，未获明确授权不自动发送或写回。 |

粗略工作量：P0–P4 约 1–2 周单人开发；P5 取决于 PPS 安装权限、网络、凭据和 ALM 批量接口，单独估算。不是交付承诺。

## 4. 数据契约（先固定，再写 Agent 提示词）

- `Snapshot`：`snapshot_id`、`project_key`、`build_number`、`baseline`、`alm_scope`、`collected_at`、`source_status`（每来源 `ok/missing/stale/error/unmatched`）、`manifest_path`。`snapshot_id` 应由项目/构建/基线/输入哈希稳定生成。
- `RiskEvent`：稳定 `event_key`（项目 + 规则 + 实体 + 基线）、`snapshot_id`、`rule_id/version`、`category`（task/timing/quality）、`severity`、`title`、`description`、`entity_id`、`evidence_refs`、`detected_at`、`status`。
- `Evidence`：来源系统、相对文件路径或 ALM 工单 ID、原始行／字段定位、输入哈希。API 返回可展示的最少字段，不泄漏原始业务文本或本机绝对路径。
- 运行门禁：DOORS/QC/ALM 未匹配或解析失败时，相关规则标记 `not_evaluated`，不是 `passed`；质量 Agent 不得把缺失当作“没有风险”。

## 5. PPS 与旧代码的使用原则

1. **离线优先。** 先用现有缓存验证数据契约、规则和看板，避免把网络／认证故障与业务规则混在一起。
2. **PPS 只做适合它的采集动作。** `pps jenkins download-file` 的参考文档说明：即使 HTTP 失败也可能把错误页面写入输出文件，因此必须先检查退出码，再验证 ZIP、哈希、文件结构。`pps alm get-workitem-info` 输出双重 JSON 编码，需要适配；它不是批量迭代查询接口。
3. **旧代码只迁移算法和字段映射。** 不直接运行 `step7_ALM.py`/`Step0_ALM_Analysis.py` 作为 Agent 工具：旧代码有 `verify=False`、可能触发构建、`extractall` 及删除旧缓存。新实现必须启用证书校验、限制 ZIP 解压路径、默认禁止写操作和删除操作。
4. **凭据隔离。** 不读取或复制 `.app_cache/cred`，不在 Kanban 卡片、日志、命令行参数和 Git 中放口令／令牌。在线访问优先使用受控 keyring；敏感输出要脱敏。

## 6. 测试与完成判据

- 同一批准的试点构建重复运行，生成相同 `snapshot_id` 和同一组事件键；原始缓存内容与修改时间不变。
- 每条风险都能回溯到文件行/字段或 ALM 工单 ID；规则计算结果与旧工具在选定小样本上的结果一致，差异有记录。
- 缺少 QC 文件、ALM scope 不匹配、PPS 下载失败、坏 ZIP、API 不可用时，看板显示相应数据/运行异常，不显示虚假的“全绿”或“Agent online”。
- 只有当后端拥有成功运行记录且数据新鲜时，页面才显示在线和检查数量；旧示例事件不再混入真实数据。
- Hermes 三张正式任务全部完成后，API 返回与快照/事件文件一致的数据；失败的采集任务不会放行质量任务。

## 7. 接下来立即执行的一个步骤

先完成 **P0 项目／基线对齐**：从 `.app_cache/jenkins` 选一组含 DOORS/QC 的构建，再从 `alm_cache.json` 选对应 ALM scope，核实它们确属同一项目和基线。当前可调查的候选是 AeroHT；若无法证明 `build 33 ↔ BL4.0`，先以 DOORS/QC 双源启动离线 MVP，把 ALM 明确标为 `unmatched`，不得强行关联。

P0 确认后，先实现 `collect --config pilot.yaml` 和匿名测试数据，再创建新的 Hermes 正式任务链。保留现有 DRY RUN 三卡作为流程验收历史。

## 参考依据

- 旧项目：`step7_ALM.py`、`step0_QC.py`、`Step0_ALM_Analysis.py`；本地 `.app_cache` 的只读结构检查。
- PPS 文档：`skills/pps-cli/SKILL.md`、`tasks/jenkins/inspect-build.md`、`references/jenkins/download-file.md`、`tasks/alm/lookup.md`、`references/alm/get-workitem-info.md`。
- 当前前端：`src/pages/AgentMonitorPage.jsx`、`package.json`；Hermes `swpm-monitor` 看板三张任务的完成摘要。
