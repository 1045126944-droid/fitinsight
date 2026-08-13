# FitInsight JSON 1.0 / 1.1 数据规范

本文描述供 FitInsight“同步健康数据”入口读取的原始 JSON。它是导入格式，不是数据库备份格式；备份中的训练 `id` 和身体测量 `key` 等规范化字段不应复制到本格式。

## Shortcuts 1.1 单日简化格式

FitInsight 也接受 `schemaVersion: "1.1.0"` 的单日简化对象：顶层包含带时区偏移的 `generatedAt`、可选的 `timezone`/`source`、必填 `daily.date`，以及可选 `sleep`、`body` 和 `workouts`。简化别名会映射为现有字段：`distanceKm` → `walkingRunningDistanceKm`、`restingHeartRate` → `restingHeartRateBpm`、`hrv` → `hrvSdnnMs`。Workout 可只提供 `type` 和带偏移的 `start`；本地日期由 `start` 推导。完整示例与逐动作搭建见 [`shortcuts-setup-zh.md`](shortcuts-setup-zh.md)。

未知值必须为 `null` 或省略；`0` 只表示已确认的真实零值。1.1 导入仍按当天日期 patch：同日更新、不重复，历史其他日期不会被覆盖。

## 顶层结构

顶层必须是一个 JSON 对象。必填字段如下：

| 字段               | 类型   | 说明                                         |
| ------------------ | ------ | -------------------------------------------- |
| `schemaVersion`    | string | 语义版本，例如 `1.0.0`；当前只接受主版本 `1` |
| `generatedAt`      | string | 带 `Z` 或 `±HH:MM` 偏移的 ISO 8601 时间戳    |
| `timezone`         | string | 有效 IANA 时区，例如 `Asia/Shanghai`         |
| `source`           | string | 1–200 字符的生成来源说明                     |
| `dailyRecords`     | array  | 最多 400 条 `DailyRecord`                    |
| `workouts`         | array  | 最多 5,000 条 `Workout`                      |
| `bodyMeasurements` | array  | 最多 2,000 条 `BodyMeasurement`              |

`coverage` 可省略或为 `null`。导入文件应省略 `profile`：即使提供，FitInsight 也会忽略它并产生 `profile_ignored` 警告，个人资料只能在应用内本地保存。未知的其他顶层字段目前会被忽略，不应依赖它们。

## coverage 与“未查询/查询为空”语义

`coverage` 用来区分“快捷指令查询过但没有结果”和“根本没有查询”。格式为：

```json
{
  "startDate": "2026-07-25",
  "endDate": "2026-08-08",
  "includedMetrics": ["steps", "sleep", "workouts"],
  "mode": "patch"
}
```

- 日期为闭区间，使用 `YYYY-MM-DD`。
- `mode` 当前只能是 `patch`。
- `includedMetrics` 使用规范键：`steps`、`activeEnergyKcal`、`exerciseMinutes`、`standHours`、`walkingRunningDistanceKm`、`restingHeartRateBpm`、`hrvSdnnMs`、`sleep`、`workouts`、`weightKg`、`bodyFatPercentage`、`skeletalMuscleMassKg`、`waistCm`。
- 某日期在某指标的 coverage 内且记录为空，才可把“没有训练”等计为已观察的零。没有 coverage、指标不在 `includedMetrics`、或日期不在范围内，都表示未知，绝不等于零。
- 空的 `workouts: []` 配合覆盖该日期的 `workouts`，表示已查询且当天没有训练；没有这项 coverage 时，空数组只表示文件未提供训练。

## DailyRecord

每条记录至少需要 `date: "YYYY-MM-DD"`。其余字段可省略或为非负数/`null`：

| 字段                       | 单位                                             |
| -------------------------- | ------------------------------------------------ |
| `steps`                    | 步                                               |
| `activeEnergyKcal`         | 千卡                                             |
| `exerciseMinutes`          | 分钟；Apple Exercise Time 的日汇总               |
| `standHours`               | 小时计数；Apple Stand Hour，不是 Stand Time 分钟 |
| `walkingRunningDistanceKm` | 千米                                             |
| `restingHeartRateBpm`      | 次/分钟                                          |
| `hrvSdnnMs`                | 毫秒，SDNN                                       |
| `sleep`                    | `SleepRecord` 或 `null`                          |

同一个文件内同日记录只保留最后一条并警告。跨导入按 `date` patch 合并。

## SleepRecord 与醒来日归属

`sleep` 可为 `null`，或包含以下可空字段：`start`、`end`、`totalMinutes`、`awakeMinutes`、`coreMinutes`、`deepMinutes`、`remMinutes`、`source`。`start`/`end` 必须带显式时区偏移。

跨午夜睡眠归到醒来日：例如 `2026-08-07T23:02:00+08:00` 至 `2026-08-08T06:58:00+08:00` 放在 `date: "2026-08-08"` 的记录里。`totalMinutes` 是实际睡眠总分钟，不要把 `In Bed` 与 Core/Deep/REM 分钟相加；阶段分钟只用于完整性检查。

## Workout、类型映射与稳定标识

训练至少需要 `localDate` 和带偏移的 `start`。可选字段为 `externalId`、`rawType`（也兼容读取 `type`）、`end`、`durationMinutes`、`activeEnergyKcal`、`distanceMeters`、`swimmingStrokeCount`、`averageHeartRateBpm`、`maximumHeartRateBpm`、`heartRateSamples`、`source`、`device`。

当前类型映射：

| 原始类型示例                                          | 规范类型              |
| ----------------------------------------------------- | --------------------- |
| `Pool Swimming`、`Pool Swim`、`泳池游泳`              | `poolSwimming`        |
| `Open Water Swimming`、`公开水域游泳`、`开放水域游泳` | `openWaterSwimming`   |
| `Traditional Strength Training`、`传统力量训练`       | `traditionalStrength` |
| `Functional Strength Training`、`功能性力量训练`      | `functionalStrength`  |
| `Walking`、`Walk`、`步行`                             | `walking`             |
| `Running`、`Run`、`跑步`                              | `running`             |

其他非空类型会归为 `other` 并产生 `unknown_workout_type` 警告。导入文件不要写规范化 `id`。FitInsight 优先生成 `external:<externalId>`；没有 `externalId` 时，以规范类型、`start`、`source` 和 `device` 生成稳定 fallback 标识。同一文件中相同稳定标识只保留最后一条并警告。

## HeartRateSample

`heartRateSamples` 可为 `null`、空数组或样本数组，最多 20,000 条。每条样本为：

```json
{ "timestamp": "2026-08-08T15:41:00+08:00", "bpm": 143 }
```

时间戳必须带偏移，`bpm` 必须是有限非负数。无效样本会单独忽略并警告，不会跳过整条训练。`null` 表示未提供复杂心率明细；空数组表示已提供一个已知为空的集合。

## BodyMeasurement

每条测量至少需要 `date`。可选字段为带偏移的 `measuredAt`、`weightKg`、`bodyFatPercentage`、`skeletalMuscleMassKg`、`waistCm`、`source`。

导入文件不要写规范化 `key`。FitInsight 使用 `measuredAt` 作为稳定键；没有有效时间戳时回退到 `date`。因此同一天多次测量应提供不同的 `measuredAt`，同键重复则只保留最后一条并警告。

## 单位、null、空数组和 patch 合并

- 固定使用公制和上表单位；不要把 `"310 kcal"` 这类带单位文本放进数字字段。纯数字字符串可读取，但推荐 JSON number。
- 负数、`NaN`、Infinity 或错误类型会变为 `null` 并警告。
- `null`/缺省表示未知。数据库 patch 合并不会用 `null` 擦除同键旧的非空值；非空新值会更新旧值。
- 非空数组作为一个值替换同键旧数组；集合顶层的空数组不会删除数据库中不在本 patch 里的旧记录。
- `coverage.mode: "patch"` 只添加/更新本文件出现的稳定键，不是整库镜像，也不是删除指令。

## 致命错误、记录跳过和警告

下列情况整份文件拒绝且不写入：无效 JSON；顶层必填字段/集合缺失；日期、`generatedAt`、时区、版本格式无效；集合超过安全上限；或主版本不是 `1`。错误码分别为 `invalid_json`、`invalid_envelope`、`unsupported_version`。

顶层有效时，单条 `DailyRecord` 缺少有效 `date`、`Workout` 缺少有效 `localDate`/`start`、或 `BodyMeasurement` 缺少有效 `date` 会跳过该条并产生 `skipped_record`。可选字段无效产生 `invalid_optional_metric`；重复稳定键产生 `duplicate_record_in_file`；未知训练类型产生 `unknown_workout_type`。

为便于发现单位错误，以下异常高值会保留但产生确认警告：步数 >100,000；活动能量 >15,000 千卡；锻炼/训练时长 >1,440 分钟；站立小时 >24；步行跑步距离 >200 千米；训练距离 >300,000 米；静息心率 >220；训练平均/最大心率或样本 >300；HRV >500 毫秒；游泳划水 >100,000。

导入采用“先检查预览，后确认写入”的事务流程；有警告不等于整份文件失败。

## 版本兼容策略

`schemaVersion` 必须是 `major.minor.patch`。当前解析器接受所有主版本为 `1` 的语义版本，并按 1.x 的字段规则容错读取；主版本变化表示不兼容，会拒绝导入。新增生产者应优先添加可选字段，不改变既有字段的单位或含义。

## 合成示例

完整、完全合成且经生产解析器验证为零警告的样例位于 [`public/examples/sample-health-data.json`](../public/examples/sample-health-data.json)。它不含个人资料或真实健康时间线，可用于首次体验和 Shortcut 输出对照。
