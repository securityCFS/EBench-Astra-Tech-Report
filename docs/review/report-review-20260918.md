# 技术报告评审：How Frontier Language Models Reshape Embodied Policies — A Comprehensive Evaluation of GPT-6-Astra on EBench

评审对象：`securityCFS/Ebench-Astra-Tech-Report` main 分支 `809fe38`（网页版 `dist/index.html` + `narrative.js` + 数据 `dist/data/`）。
评审日期：2026-09-18；2026-09-19 修订，采纳作者对协议、精细操作证据和 zero-shot 预算的三点回应。所有数值核对均基于仓库内 `report-figures.json`、`report-tasks.csv`、`episodes.json`、`ablations.json`、`execution-timing.json`。

---

## 0. 总评

这是一份**证据组织得非常扎实、但科学主张与呈现之间存在明显落差**的评测报告。

优点是可验证性极高：510 集逐集结果、26 个完整 ICL 输入包（417 段文本 + 365 张图）、来源哈希、逐 seed 消融、执行日志时序分析，都能在页面上直接查看和下载。这在同类 "frontier model 做具身评测" 的报告中很少见。

主要问题有四个：
1. **排名类结论没有附带不确定性。** 每任务 20/15 集是 EBench 的固定协议，八个系统一致，这不是作者的取样选择；但任务宏平均 SR 的标准误仍约 7 pp（任务间 SD 35 pp），"第二名"与第三名 Qwen-RobotManip 的差距只有 1.15 pp。需要的是报告区间并软化排名措辞，不需要新实验。
2. **三个任务属性维度互相嵌套，报告却把它们当成三个独立发现来讲。** 4 个高精度任务全部是固定基座 + 短程；7 个长程任务全部是移动任务。"移动操作强"、"精细操作弱"、"长程弱"在很大程度上是同一批任务从不同角度的复述。
3. **ICL 的贡献与推理成本没有在正文中交代。** 主实验全部为 single-shot ICL。作者说明原因是预算（两个 Pro 订阅加约 1500 美元 API）以及 zero-shot 试跑成本高、表现差；这个理由合理，"对比策略都在大规模数据上后训练，给 Agent 一个示范是对等设置"的公平性论证也站得住。两者都应写进论文，并把已经花掉的成本作为每集成本报告出来；Agent 无 token / 时间 / 调用上限而对比策略为实时闭环这一点，也应在同一处说明。
4. **标题与引言的口径远大于证据**。"Reshape Embodied Policies"、"paradigm shift"、"unimaginable level of adaptability" 与后文谨慎的 caveat 风格不一致；页面上没有任何相关工作引用。

数据里其实还有几个**被低估的更强结论**（见第 6 节）：在 12 个"移动 + 短程"任务上 Astra 以 73.2% 领先 OpenWAM-α 的 65.3%；在四种扰动条件下 Astra 的波动幅度只有 6.6 pp，是所有系统中最稳定的。这些比"总体第二名"更能说明 Astra 的能力形状。

---

## 1. 清晰度（Clarity）

### 1.1 做得好的地方
- 阅读顺序合理：动机 → 基准结果 → 实验设置 → 完整对比 → 三个研究问题 → 案例 → 结论。每个分析段落先给数字再给解释。
- 术语边界写得很清楚：task-macro SR（46.73%）与 episode-weighted SR（46.47%）区分明确；"selected qualitative rollout" 与 main cohort 反复区分；POC 与 ICL 实验的独立性反复强调。
- 每个案例视频都附 seed、terminal SR/Score，避免读者把演示当成统计证据。
- 对 hidden reasoning 和 public tool `reason` 字段的区分是负责任的写法。

### 1.2 需要改进的地方
- **缩写从未展开**：VLA、WAM、EEF、POC、ICL（只在 overall 区块展开过一次）、cuRobo、URDF、RSI 在首次出现处没有定义。"AGENT · VLA · WAM" 出现在章节眉标却无解释。
- **模型命名不一致**：`OpenWAM-α` / `OpenWAM` / `OpenWAM-Alpha`（CSV）；`Fast-WAM` / `FastWAM`；`Fixed` / `Tabletop`；`Pi05` / `π₀.₅`。建议在 Setup 给一张系统表，统一显示名、数据键、来源、参数量、训练数据。
- **Score 的定义只在弹窗里**（"normalized terminal partial credit under task-specific rules"），而 Score 是全文第二主指标。至少应在 Benchmark Results 正文中说明它是如何逐任务定义的，以及不同任务的 Score 是否可比（例如 `shop` 全部 20 集 Score 0.5958 但 SR 0，显然是阶段性给分）。
- **510 集的构成没有明说**：它实际上就是 4 种扰动条件 × 5 seed × 26 任务（object 条件缺 2 个任务，因而 make_sandwich / microwave 只有 15 集）。也就是说**主实验不存在"无扰动"基线条件**。这一点对解读"泛化"段落很关键，但要靠读者自己从 120 + 130 × 3 = 510 推出来。
- **动作接口描述不足**：Agent 输出的是 EEF 位姿 + 夹爪 + 底盘 + 时长，由 cuRobo 解 IK。但 waypoint 的数量/格式、一次 action chunk 的最大时长（日志显示最长 6.4 s 仿真时间）、观测返回的频率、以及 "fresh model thread" 与 "recovery may reconstruct a thread" 的具体机制，都需要一个小节或图示。这些直接决定了后文"反馈延迟导致长程失败"论断的可信度。
- **引言语气**："Ever since the launch of GPT-6-Astra on September 3, 2026, the tech landscape has witnessed a paradigm shift… breathtaking capabilities… unimaginable level of adaptability" 是产品文案而非技术报告写法，并且与后文大量谨慎 caveat 形成割裂。建议压缩为两句中性陈述并给出引用。
- **标题过度承诺**：报告只评测了一个模型、一个基准、单次运行；"How Frontier Language Models Reshape Embodied Policies" 更像一篇立场论文的标题。更准确的标题例如 "A Frontier Multimodal Agent as a Robot Policy: Evaluating GPT-6-Astra with Single-Shot ICL on EBench"。
- 页面上**没有任何参考文献**（EBench 只有链接）。至少应引用 EBench 论文、所有对比模型的论文/技术报告、cuRobo、RPent，以及 LLM-as-policy 的代表性先前工作。

---

## 2. 新颖性（Novelty）

### 2.1 真正新的部分
- **首个在 EBench 全部 26 任务 / 510 集上把 frontier 多模态模型当作端到端策略来跑的系统对比**，并与 7 个后训练 VLA/WAM 用同一台仿真、同一批扰动条件比较。
- **ICL 包完全公开**：由另一个 GPT-6-Astra 实例从训练集视频自动挑关键帧并写注释，形成 10–18 帧的示范包。把"模型自己给自己写示范"这一流程的所有输入原样公开，是很少见的透明度。
- **执行日志级的时序 / 关节速度分析**（3 集）：把 wall time 与 sim time 分开报告，明确指出 wall − sim ≠ 推理时延，这是正确且少见的做法。
- **安全视角**：把"仿真可执行"与"硬件可接受"分开，用三段录像引出三个可检验的控制问题。

### 2.2 新颖性不足的部分
- **方法本身不新**：LLM/VLM 输出 EEF waypoint、由运动规划器执行、按 chunk 返回观测，是 2022–2025 年大量工作（SayCan、Code as Policies、VoxPoser、ReKep、MOKA、GPT-4V 机器人评测等）的常见范式。报告没有和这些工作比较设计选择，也没有说明本 harness 与它们的差异（例如是否有 affordance / 关键点提取，是否允许代码执行）。
- **"探索、恢复、经验利用"三个新能力**目前只有定性案例（apple 006、coffee 013、fruit 015、teacup），没有跨 episode 的计数。这类观察在 LLM agent 文献中已是共识，要成为本报告的贡献需要**量化**：273 个未完成 episode 中有多少发生了重试、重试后有多少成功、重试是否消耗了预算。
- 消融（8 对）、POC（4 段视频、无数字）规模太小，目前只能算 anecdote。

---

## 3. 贡献（Contribution）

按可被引用的程度排序：

| 贡献 | 强度 | 说明 |
| --- | --- | --- |
| 26 任务 × 8 系统结果矩阵 + 4 扰动条件 | 强 | 数据完整、可下载、有来源哈希 |
| 510 集逐集 SR/Score + 27 段代表性视频 | 强 | 但只有 Astra 有逐集数据，对比模型只有线上汇总 |
| 26 个 ICL 包完整公开 | 强 | 对复现和后续"示范质量 vs 成功率"分析很有价值 |
| 能力剖面结论（移动/视觉定位强，精细/长程弱） | 中 | 方向正确但受第 5.2 节的嵌套问题影响 |
| 失败模式（接触不确定、局部重试不收敛） | 中弱 | 只有 2 种模式 + 选定视频，没有覆盖 273 集的编码统计 |
| 涌现能力（探索/恢复/经验利用） | 弱 | 定性；报告自己也承认不测跨 episode 学习 |
| 安全分析 | 中 | 问题提得好，但仍缺 URDF 对照，结论是"应当分析" |
| 结论四个方向（agent+policy 耦合、意图模仿、经验→工具/RSI、安全进策略） | 弱 | 属于 position，与本报告实验无直接因果 |

---

## 4. 分析的优点

1. **Score–SR 解耦分析**是全文最有信息量的角度。peg_in_hole（Score 0.60 / SR 20%）、tighten_nut（0.55 / 10%）、dishwasher（0.5333 / 5%）清楚地说明"接近但未完成"。逐集数据进一步显示 tighten_nut 20 集里 18 集拿到部分分、0 集零分；peg_in_hole 16/20 部分分——这比文字更有说服力，建议在页面上直接画出来（见第 8 节）。
2. **明确区分 within-episode 与 cross-episode**：报告没有把 apple 006 的"吸取教训"夸大为学习能力，这是很多同类报告做不到的克制。
3. **对提示词中已有的引导（grasp verification、"local EEF z 不是桌面高度"）如实披露**，避免把提示工程当作模型涌现能力。
4. **将 bottle / shop 这类所有系统 SR 均为 0 的任务单独点出**，避免用它们解释相对排名。
5. **执行时序**：三集 wall/sim 比 21×、43×、40×（12 分钟到 84 分钟每集）。这是全文最"扎心"的数字之一，报告有意识地把它做成可复现脚本。

---

## 5. 分析的弱点与方法学问题

### 5.1 统计强度与不确定性（最重要）
- 每任务 20 或 15 集由 EBench 协议固定，八个系统相同，因此相对比较是同口径的。但一个任务 SR 的 95% 二项区间宽度仍约 ±20 pp；26 任务宏平均的标准误 ≈ 7 pp（Astra 任务间 SD = 35.2 pp）。
- 总体 SR 46.73% 与 Qwen-RobotManip 45.58% 差 1.15 pp，与 π₀.₅ 差 5.3 pp——**"ranks second on both metrics" 在统计上不可区分**。与 OpenWAM-α 的 8.59 pp 差距在 episode 级二项近似下 z ≈ 2.7，但考虑任务聚类后也只是勉强显著。
- 对比模型的数字来自线上 leaderboard `taskOverview`（每模型 1 次提交），同样没有方差。本仓库同事的另一份分析（eb-harness `docs/astra_benchmark_analysis.md`）中 π₀.₅ 三次运行 SR SD = 1.2 pp，说明策略侧噪声并不小。
- **建议**：给出 episode-level Wilson 区间与 task-level bootstrap 区间，把排名表述改成"与 OpenWAM-α 有差距、与 Qwen-RobotManip / π₀.₅ 处于同一区间"。这不需要新实验；问题在结论措辞，不在取样设计。若想单独估计 Agent 自身的随机性，可在两三个任务上重复同一批 seed，但这不是本报告必须做的。

### 5.2 任务属性维度互相嵌套（被报告忽略的混杂）
交叉表（来自 `report-figures.json`）：

| Mobility | Precision | Horizon | 任务数 |
| --- | --- | --- | ---: |
| Fixed | High | Short | 4 |
| Fixed | Medium | Short | 2 |
| Fixed | Low | Short | 1 |
| Mobile | Low | Short | 9 |
| Mobile | Medium | Short | 3 |
| Mobile | Low | Long | 4 |
| Mobile | Medium | Long | 3 |

- **全部 High-precision 任务 ⊂ Fixed**；**全部 Long-horizon 任务 ⊂ Mobile**；Fixed 任务全部是 Short。
- 因此报告第 01 节"mobile 强（56.58 vs 60.18）、tabletop 弱（20.00 vs 42.14）"和第 02 节"precision 从 60.60 掉到 11.25"很大程度上是**同一组 7 个固定基座任务**的两种描述，不是两个独立发现。报告只在 fineprint 里写了 "Groups overlap"，正文叙事却把它们当成两条证据链。
- 需要说明：精细操作失败本身有独立证据，glasses、peg、gear、nut 的对比视频和动作日志都显示 Astra 能到达邻域但无法完成对准，这个结论不受本节影响。本节要求的是：(a) 正文明确写出三个维度嵌套，避免读者把同一批任务当成三条证据；(b) 固定基座中 Low/Medium 三个任务（frame、flip_cup、put_glass）落后 30 到 80 pp，精度解释不了，需要单独讨论；(c) 既然日志在手，把"到达邻域后的对准重试次数"统计出来，视觉证据就能变成数字。
- 更细的拆分（我按仓库数据重算）反而更有说服力，见第 6 节。

### 5.3 ICL 贡献没有在主实验中测量（作者说明：预算所限）
- 主实验 510 集全部是 single-shot ICL，**没有 zero-shot 对照**。报告自己承认 "the headline result cannot measure the improvement due to demonstrations alone"。
- 消融只有 8 对新鲜配对（frame / gear）+ 5 对历史 dishwasher 对照：SR 0/8 → 3/8，但 Score 4 升 3 降 1 平。样本量不足以支持 "ICL turns intent into a suitable interaction strategy" 的一般性说法。
- ICL 包由另一个 GPT-6-Astra 实例自动生成，**没有任何示范质量控制或质量指标**。26 个包的关键帧数（10–18）与文本量差异明显，完全可以做一个"示范质量 / 长度 vs 任务 SR"的相关分析，数据已经在仓库里。
- 作者说明未跑 zero-shot 主实验的原因是预算（两个 Pro 订阅加约 1500 美元 API），且试跑显示 zero-shot 成本更高、表现更差；给 Agent 一个示范，与对比策略在大规模数据上的后训练相比，是对等甚至更保守的设置。这两点都合理，建议直接写进 Setup 或 Limitations，并把 8 对新鲜配对与 5 对历史 dishwasher 对照明确表述为"预算内能做的 zero-shot 信号"。ICL 贡献未测仍应列为 limitation。

### 5.4 计算预算不对等与执行时长
- "The policy phase has no additional aggregate token, tool-call, or wall-clock cap." Agent 每集可用 12–84 分钟 wall time、最多 54 次工具调用（coffee 013），而 VLA/WAM 是固定频率的闭环策略。报告用 "environment-level comparisons, not matched inference-cost measurements" 一句话带过，**但这直接影响"第二名"的意义**。
- 每集成本（token 数、美元、调用次数）完全没有报告。作者在讨论中给出的总投入（两个 Pro 订阅加约 1500 美元 API，覆盖 510 集主实验、消融与案例）正是缺失的数字，折算后约每集几美元量级，建议直接写进论文。510 集的总 wall time 按三集均值估算在 200–400 小时量级，也应在主文出现，而不是只在 "Evaluation protocol & execution measurements" 弹窗。
- 建议：给出每集 token / 调用次数 / wall time 的分布（全部 510 集的日志应该都有），并至少画一张 SR-vs-cost 的 Pareto 图与 VLA 对照。

### 5.5 定性案例的选择偏差
- teacup / glasses / frame / gear / POC 都是 "selected rollouts"。报告有免责声明，但**没有说明选择规则**（是随机抽取、还是挑最能说明观点的？）。glasses 案例甚至没有 seed 与分数。
- "Recovery" 作为 Astra 的标志能力，只有 apple 006 一个有日志支撑的实例。建议对 237 个成功 episode 做一个自动统计："成功之前是否发生过至少一次夹爪空抓/物体掉落"，这样"从失败中恢复"就有了频率。

### 5.6 对比模型的来源与可复现性
- Qwen-RobotManip、GigaBrain-0.7、Fast-WAM、OpenWAM-α 的模型描述、参数量、训练数据、是否在 EBench 训练集上后训练，页面上一概没有。而 Setup 又写 "The compared VLA/WAM policies have been trained on the benchmark task types"——这个论断需要来源。
- 脚注 1 排除 Amapbot Group 的理由（缺乏可靠模型描述）同样适用于上述几个模型，标准应一致。
- 对比模型用的 checkpoint / 提交日期只在 `online-totals.json` 里（2026-09-17 检索），正文应注明。

### 5.7 Score 的可比性
- 各任务 Score 规则不同（如 bottle 的 20 集全是部分分 0.1667 平均；shop 20 集全部 0.5958 左右），跨任务宏平均 Score 的含义不清楚。建议在附录给每个任务的 Score 阶段定义，或至少说明 Score 是由 EBench 服务器统一定义。

### 5.8 失败模式分析缺少覆盖率
- "Two recurring patterns organize the failures"——但 273 个未完成 episode 中各占多少？报告没有任何失败编码。install_gear 20 集有 15 集零分、utensils_to_holder 13 集零分、put_glass 10 集零分：这三个任务是**零分主力**，其失败模式（完全没进展）与 tighten_nut / peg（几乎全部有部分分）性质不同，正文却把它们都归到"接触不确定"。
- 建议做一个简单的四类编码（未抓到 / 抓到未放对 / 放对未满足终态 / 超时或崩溃）并给出 273 集的计数。日志已在证据包里。

### 5.9 安全与结论部分
- 安全一节的三个案例都是"可能有风险"的推断，报告写得诚实，但关节速度 1.9–2.3 rad/s 这种数字与常见协作臂限速（例如 1.5–3 rad/s）的对照很容易做，至少可以给一个量级判断。
- 结论四个方向（agent + on-device policy、intention imitation、experience → tools / RSI、safety in policy）与本报告的实验没有直接因果，更像 position statement。建议明确标注为 "Discussion / Outlook"，并把 RSI 这种远景与 "apple 006 一次 within-episode 修正" 之间的距离说清楚。

---

## 6. 数据中被低估的发现（建议补进正文）

以下均按仓库数据重算，任务宏平均 SR（%）：

| 子组 | n | OpenWAM-α | **Astra** | Qwen | π₀.₅ | InternVLA | π₀ | GigaBrain | Fast-WAM |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile ∩ Short | 12 | 65.28 | **73.19** | 50.28 | 50.42 | 46.67 | 38.47 | 35.00 | 41.25 |
| Mobile ∩ Long | 7 | 51.43 | 28.10 | 33.10 | 38.10 | 34.76 | 26.43 | 25.71 | 21.67 |
| Fixed, Low/Medium | 3 | 55.00 | 31.67 | **91.67** | 45.00 | 10.00 | 46.67 | 55.00 | 1.67 |
| Fixed, High | 4 | 32.50 | 11.25 | 18.75 | 17.50 | 13.75 | 22.50 | 25.00 | 3.75 |

1. **在移动 + 短程的 12 个任务上，Astra 是 8 个系统中的第一名**，领先 OpenWAM-α 约 8 pp。现在正文写的是"mobile 落后 3.6 pp"，那是被 7 个长程任务拉低的结果。这是报告最强、也最干净的正面结论，目前完全没有被讲出来。
2. **固定基座的弱势不只来自精度**：Fixed 中 3 个 Low/Medium 任务（frame、flip_cup、put_glass）Astra 只有 31.67%，而 Qwen 91.67%。flip_cup 10% vs 90%、put_glass 20% vs 90% 与"精细对准"关系不大，更像是固定视角下的空间/深度理解或双臂协同问题。这与内部分析笔记中提到的"深度理解偏差""很少生成双臂同时移动的 waypoint"一致，值得单独成节。
3. **Astra 是扰动条件下最稳定的系统**：四条件 SR 范围 6.6 pp（OpenWAM-α 16.9、Qwen 21.5、π₀ 17.7）；Mixed 条件下 Astra 46.15% 排第一。报告只说 "remains competitive"，其实"对组合扰动几乎不敏感"是 LLM 先验的直接证据。
4. **逐任务名次呈双峰**：Astra 在 26 任务中 9 个第一（含 3 个并列）、5 个第二，但也有 6 个倒数第二/第三（dishwasher −85 pp、flip_cup −80 pp、put_glass −70 pp、coffee −50 pp、detergent −45 pp、install_gear −35 pp）。用"总体第二"概括这种分布会丢失信息；一张 26 任务的 Astra-minus-best-other 条形图能一眼看出能力形状。
5. **零分任务与部分分任务是两类失败**（见 5.8）：install_gear / utensils / put_glass 的零分率 50–75%，tighten_nut / peg / shop / bottle 的零分率 0–30%。

---

## 7. 数值核对结果

核对了正文和 `narrative.js` 中的全部主要数字，**未发现与仓库数据矛盾**：8.59 pp、3.60 pp、20.00 vs 42.14、90 vs 55（bookmark，+35 pp）、100% remote_to_holder、11.25% 高精度且排名第 7、28.10 vs 51.43、peg 0.60/20%、nut 0.55/10%、detergent 55%/0.80、dishwasher 5%/0.5333、237/188/85、46.47% vs 46.73%、Mixed 条件领先 2 集（60 vs 58 / 130）、8 对消融 0→3 成功，均一致。

两点注意：
- eb-harness 内部笔记中 OpenWAM 为 55.31 / 0.7015、π₀.₅ 为 41.00 / 0.5682（多次运行均值），与报告采用的线上单次汇总 55.32 / 0.7005、41.41 / 0.5441 不同。报告的口径（线上值）已在 `report-SOURCE_MAP.json` 说明，但正文应注明"对比模型为线上 leaderboard 单次提交值"。
- `app.js` 里硬编码的 `models` 数组与 `report-figures.json` 重复，若数据更新容易漂移；建议排行榜也从 JSON 生成。

---

## 8. 呈现层面的问题（网页）

1. **被覆盖的大数字组件**：`app.js` 渲染了 "56.58% SR on 19 mobile tasks" 和 "100% / 90%" 两个 task-highlight 按钮，以及 limits 区的 "11.25%" 指标块，但随后 `narrative.js` 的 `initNarrative()` / `updateLimitNarrative()` 用 `innerHTML` 整块替换了 `.finding-story`，这些组件实际**从未显示**。要么删掉死代码，要么把叙事插到指标块之后。
2. 图表全部是单色横向柱状图，缺少对比模型的并排视图；任务热力表默认只在弹窗/第二个 tab 里；510 集点阵按结果排序，看不出"哪些任务在失败"。第 6 节的几个结论都需要新的图（refined-group 对比、Astra-minus-best 条形、逐任务 20 集 outcome 条）。
3. 缩写、命名、Score 定义（见 1.2）。
4. 时序表只在弹窗里；建议在 Safety 或 Setup 正文放一张 wall-vs-sim 小图。
5. 引言 Matrix 引言 + 数字雨动画与技术报告定位不符（作者要求保留，此处仅记录）。
6. 页面在 1400 px 以上侧边目录会把正文推到右侧 230 px，1180 px 的 shell 在 1440 屏上只剩约 1000 px 有效宽度，热力表需要横向滚动。

---

## 9. 修改建议（按优先级）

**必须（影响结论正确性）**
1. 给所有汇总指标加置信区间；把"第二名"改写为区间表述。
2. 在 Setup 明确说明三个属性维度嵌套关系，并用第 6 节的细分子组替换或补充现在的 mobility/precision/horizon 三张图。
3. 注明 510 集 = 4 扰动条件 × 5 seed，主实验无"无扰动"条件。
4. 报告每集 token / 调用 / wall time 分布与总成本（总成本数字作者已有）；把 wall/sim 比放进正文。
5. 在 Setup 或 Limitations 写明未跑 zero-shot 主实验的原因（预算、试跑观察）与 ICL 设置的公平性论证，把 ICL 贡献列为未测。

**应该（影响可信度）**
6. 对 273 个未完成 episode 做失败编码并给出计数。
7. 对 237 个成功 episode 统计"曾发生抓取失败后恢复"的频率，让 recovery 成为定量结论。
8. 增加系统表（对比模型来源、训练数据、checkpoint 日期）和参考文献。
9. 统一命名，首处展开缩写，在正文定义 Score。
10. 收敛引言语气与标题。

**可以（提升呈现）**
11. 修复被覆盖的指标组件；新增 Astra-minus-best 逐任务图、逐任务 outcome 条、扰动稳定性图；时序小图进正文。
12. 结论标注为 Discussion/Outlook；把 RSI 与本报告证据的距离写明。
