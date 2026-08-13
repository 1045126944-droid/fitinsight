# 在 iPhone 创建“FitInsight 同步”快捷指令

这份指南用于手动搭建第一版同步链路：

`Apple 健康 → FitInsight 同步快捷指令 → iCloud Drive JSON → 打开 FitInsight → 手动确认导入`

第一版不需要服务器，也不会自动把文件交给网页。你每天运行一次快捷指令，再在 FitInsight 点一次“选择健康数据”即可。

> 本轮真机建议先使用下面的 **1.1 单日简化版**。它最容易在 iPhone 上搭建，FitInsight 同时继续兼容后文的 1.0 多日完整格式。

## 1.1 单日简化版：先真正跑通

最终文件固定为：

```json
{
  "schemaVersion": "1.1.0",
  "generatedAt": "2026-08-09T20:42:00+08:00",
  "timezone": "Asia/Shanghai",
  "source": "FitInsight Shortcut",
  "daily": {
    "date": "2026-08-09",
    "steps": 8500,
    "activeEnergyKcal": 620,
    "exerciseMinutes": 52,
    "distanceKm": 6.8,
    "restingHeartRate": 63,
    "hrv": 51
  },
  "sleep": {
    "totalMinutes": 436,
    "awakeMinutes": 22,
    "coreMinutes": 235,
    "deepMinutes": 72,
    "remMinutes": 129
  },
  "body": { "weightKg": 81.6, "bodyFatPercentage": null },
  "workouts": []
}
```

未知值必须用 JSON 的空值 `null`，或者暂时省略对应键；不要写 `0`，也不要写字符串 `"null"`。

### Step 1 — 新建快捷指令和今天日期

1. 打开“快捷指令”→ 右上角 `+` → 点顶部名称 → 输入 `FitInsight 同步`。
2. 添加“当前日期 / Current Date”→“设定变量 / Set Variable”→ 命名 `GeneratedAtDate`。
3. 添加“格式化日期 / Format Date”，输入 `GeneratedAtDate`，格式选“自定义”，填 `yyyy-MM-dd` → 变量 `TodayDate`。
4. 添加“调整日期 / Adjust Date”，把 `GeneratedAtDate` 调整为“一天开始时间 / Start of Day”→ 变量 `TodayStart`。
5. 再添加“调整日期”，给 `TodayStart` 增加 `1 天` → 变量 `TomorrowStart`。

下面所有健康查询都使用同一筛选：开始日期在 `TodayStart` 或之后，并且开始日期在 `TomorrowStart` 之前。首次运行时只允许本指南列出的读取权限。

### Step 2 — 读取今天步数

1. 添加“查找健康样本 / Find Health Samples”。
2. 类型选“步数 / Steps”；筛选使用 `[TodayStart, TomorrowStart)`；关闭“限制”。
3. 如果有“来源”筛选，优先选择 Apple Watch，避免与 iPhone 同一行为重复累加。
4. 添加“计算统计数据 / Calculate Statistics”，统计选“总和 / Sum”。
5. 添加“获取测量值中的数值 / Get Numbers from Input”（不同 iOS 也可能显示“获取数字 / Get Numbers”），只保留纯数字。
6. “设定变量”命名 `Steps`。结果为空时，把 `Steps` 设为空值 `null`，不要设为 0。

### Step 3 — 活动能量、锻炼时间和距离

分别复制 Step 2 的查询块：

1. 类型改为“活动能量 / Active Energy Burned”→ 总和 →“转换测量单位 / Convert Measurement”选 `kcal` → 纯数字 → 变量 `ActiveEnergyKcal`。
2. 类型改为“Apple 锻炼时间 / Apple Exercise Time”→ 总和 → 单位选“分钟”→ 纯数字 → 变量 `ExerciseMinutes`。
3. 类型改为“步行 + 跑步距离 / Walking + Running Distance”→ 总和 → 单位选“公里”→ 纯数字 → 变量 `DistanceKm`。
4. 每项查不到时都保留 `null`；不要用设备目标或估算值补齐。

### Step 4 — 静息心率和 HRV

1. 添加“查找健康样本”，类型选“静息心率 / Resting Heart Rate”，日期同上，优先 Apple Watch。
2. 添加“计算统计数据”，选“平均值 / Average”→ 单位 `bpm` → 纯数字 → 变量 `RestingHeartRate`。
3. 复制该块，类型改为“心率变异性 / Heart Rate Variability (SDNN)”→ 平均值 → 单位 `ms` → 变量 `Hrv`。
4. 当天没有有效样本时对应变量为 `null`。

### Step 5 — 昨夜睡眠

睡眠按醒来日归到今天。先建立窗口：

1. “调整日期”：`TodayStart` 减去 `12 小时` → `SleepWindowStart`。
2. “调整日期”：`TodayStart` 增加 `12 小时` → `SleepWindowEnd`。
3. 对“睡眠分析 / Sleep Analysis”分别查询 Core、Deep、REM、Awake；日期使用这个睡眠窗口，优先 Apple Watch。
4. 每类结果使用“重复每一项 / Repeat with Each”→“获取健康样本的详细信息 / Get Details of Health Samples”选“时长 / Duration”→ 转换为分钟 → 求和。
5. 分别保存为 `CoreMinutes`、`DeepMinutes`、`RemMinutes`、`AwakeMinutes`。
6. 用“计算 / Calculate”求 `CoreMinutes + DeepMinutes + RemMinutes` → `TotalSleepMinutes`。
7. 不要再加 `In Bed` 或 `Asleep` 总计，否则会重复。完全取不到阶段时，五个睡眠值都设为 `null`。

### Step 6 — 体重和体脂

1. “查找健康样本”→“体重 / Body Mass”→ 日期同今天 → 按开始日期降序 → 打开限制，数量 `1`。
2. 取得“值 / Value”→ 转为 `kg` → 纯数字 → `WeightKg`；没有样本则 `null`。
3. 复制查询，类型改为“体脂率 / Body Fat Percentage”→ 最新 1 条 → `BodyFatPercentage`。
4. 用“快速查看”检查体脂：FitInsight 需要 `28.9`，不是 `0.289`；如果系统给 0–1 小数，先乘以 100。

### Step 7 — Workout 基础数据

1. “查找健康样本”→“体能训练 / Workouts”→ 日期同今天 → 按开始日期升序 → 关闭限制。
2. 建立空“列表 / List”并设为变量 `Workouts`。
3. 对查找结果添加“重复每一项”。在循环内依次取得：训练类型、开始日期、结束日期、时长、活动能量、总距离。
4. 开始/结束日期格式化为 `yyyy-MM-dd'T'HH:mm:ssXXX`；时长转分钟、能量转 kcal、距离转米。
5. 建立“词典 / Dictionary”，键为 `type`、`start`、`end`、`durationMinutes`、`activeEnergyKcal`、`distanceMeters`。
6. 取不到的可选值填 `null`。用“添加到变量 / Add to Variable”把词典加入 `Workouts`。
7. 第一版不要加入逐点心率、游泳划水、SWOLF、泳姿、分段或自己编造的训练 ID。

### Step 8 — 组装 1.1 词典

依次建立：

1. `Daily` 词典：`date=TodayDate`、`steps=Steps`、`activeEnergyKcal=ActiveEnergyKcal`、`exerciseMinutes=ExerciseMinutes`、`distanceKm=DistanceKm`、`restingHeartRate=RestingHeartRate`、`hrv=Hrv`。
2. `Sleep` 词典：五个分钟字段对应 Step 5 变量。
3. `Body` 词典：`weightKg=WeightKg`、`bodyFatPercentage=BodyFatPercentage`。
4. 把 `GeneratedAtDate` 格式化为 `yyyy-MM-dd'T'HH:mm:ssXXX` → `GeneratedAtISO`。
5. 建立顶层词典：`schemaVersion=1.1.0`、`generatedAt=GeneratedAtISO`、`timezone=Asia/Shanghai`、`source=FitInsight Shortcut`、`daily=Daily`、`sleep=Sleep`、`body=Body`、`workouts=Workouts`。
6. 添加“获取输入中的文本 / Get Text from Input”，输入顶层词典 → 变量 `HealthJSON`。
7. 添加“快速查看 / Quick Look”，确认以 `{` 开头、数字没有单位后缀、未知值不是 0。

### Step 9 — 保存并打开 FitInsight

1. 添加“设定名称 / Set Name”，输入 `HealthJSON`，名称填 `fitinsight-health.json`。
2. 添加“存储文件 / Save File”，位置选 `iCloud Drive/Shortcuts/FitInsight`；关闭“询问存储位置”，打开“覆盖已存在文件”。
3. 添加“URL”，填 `https://1045126944-droid.github.io/fitinsight/`。
4. 添加“打开 URL / Open URLs”。
5. 运行后回到 FitInsight →“同步”→“选择健康数据”→选 `fitinsight-health.json`→核对预览→“确认导入”。

浏览器不能替你自动选择本地文件；最后一步必须由你确认。第一次建议先只保留 Step 1、Step 2、空的 Sleep/Body/Workouts 和 Step 8–9，看到真实步数后再逐项增加。

以下名称以中文 iOS 为主，括号中给出常见英文名。iOS 版本不同可能显示为“查找健康样本 / Find Health Samples”“获取健康样本的详细信息 / Get Details of Health Samples”“计算统计数据 / Calculate Statistics”等近似名称；字段含义相同即可。

## 第一版明确支持与暂不支持

可实际导出：

- 步数、活动能量、锻炼时间、站立小时；
- 静息心率、HRV；
- 睡眠总时长、Awake、Core、Deep、REM；
- Workout 的类型、日期、开始/结束、时长、活动能量和可取得的距离；
- 游泳类型和可取得的总距离；
- 体重与体脂率。

第一版暂不支持：

- Workout 逐点心率 `heartRateSamples`；
- 可靠的 Workout 平均/最高心率、游泳分段、泳姿、逐段配速和划水明细；
- 没有出现在“健康”数据类型中的第三方骨骼肌、腰围等字段；
- 快捷指令替用户在 Safari 中自动选择文件。

这些字段取不到时请省略对应键，不要写 0，也不要写字符串 `"null"`。

## 开始前准备

1. 先确定最终 FitInsight HTTPS 地址，例如 `https://你的用户名.github.io/fitinsight/`。
2. 打开“快捷指令”App，点右上角 `+`。
3. 点顶部名称，改成 `FitInsight 同步`。
4. 点“添加操作”。之后每加完一个动作，都回到底部搜索栏继续搜索下一个动作。
5. 第一次运行健康动作时，只允许本指南用到的读取权限。若之前拒绝过，到“设置 → 隐私与安全性 → 健康 → 快捷指令”重新检查。

建议先按文末“最小验证版”只做 1 天步数。确认网页能预览后，再扩展为下面的 14 天完整版本。

## A. 建立固定变量和日期范围

### 动作 1：保存 FitInsight 地址

1. 搜索并加入“文本 / Text”。
2. 输入最终 HTTPS 地址，末尾保留 `/`。
3. 搜索并加入“设定变量 / Set Variable”。
4. 变量名填 `FitInsightURL`。

### 动作 2：取得本次结束时间

1. 搜索并加入“当前日期 / Current Date”。
2. 加入“设定变量”，命名为 `GeneratedAtDate`。
3. 加入“调整日期 / Adjust Date”，选择“获取 `GeneratedAtDate` 的一天开始时间 / Start of Day”。
4. 把结果设为变量 `TodayStart`。
5. 再加入“调整日期”，给 `TodayStart` 增加 `1 天`，结果设为 `TomorrowStart`。

### 动作 3：建立 14 天回补范围

1. 加入“调整日期”。
2. 对 `TodayStart` 减去 `13 天`。
3. 把结果设为 `RangeStart`。
4. 加入“格式化日期 / Format Date”，输入 `RangeStart`，格式选“自定义”，填写 `yyyy-MM-dd`。
5. 把结果设为 `CoverageStartDate`。
6. 再加一个“格式化日期”，输入 `TodayStart`，格式同样为 `yyyy-MM-dd`。
7. 把结果设为 `CoverageEndDate`。

### 动作 4：建立三个空数组

依次加入三次“列表 / List”，每个列表先不添加项目，并分别用“设定变量”命名为：

1. `DailyRecords`
2. `Workouts`
3. `BodyMeasurements`

再建立一个列表 `IncludedMetrics`。只有某项查询确实完成后，才把对应规范键加入该列表。

## B. 逐日建立 DailyRecord

### 动作 5：开始 14 天循环

1. 搜索并加入“重复 / Repeat”。
2. 次数填 `14`。
3. 在重复块中加入“计算 / Calculate”，计算 `重复索引 - 1`。
4. 加入“调整日期”，给 `RangeStart` 增加上一步得到的天数，设为 `DayStart`。
5. 再加入“调整日期”，给 `DayStart` 增加 `1 天`，设为 `DayEnd`。
6. 格式化 `DayStart` 为 `yyyy-MM-dd`，设为 `DayDate`。
7. 加入“词典 / Dictionary”，先只放一项：`date` = `DayDate`。
8. 把词典设为变量 `DayRecord`。

下面所有每日查询都放在这个“重复 14 次”块内。每次“设置词典值 / Set Dictionary Value”后，把输出重新设为 `DayRecord`，因为该动作会返回更新后的词典。

### 动作 6：步数 → `steps`

1. 加入“查找健康样本”。
2. 类型选“步数 / Steps”。
3. 筛选条件设为“开始日期在 `DayStart` 或之后”且“开始日期在 `DayEnd` 之前”。
4. 关闭“限制 / Limit”。如可选来源，优先 Apple Watch，避免与 iPhone 重复累加。
5. 加入“计数 / Count”。若样本数大于 0，再继续下一步。
6. 加入“计算统计数据”，统计方式选“总和 / Sum”。
7. 确认结果单位为“步”，取纯数字。
8. 用“设置词典值”写入 `steps`，并把输出重新设为 `DayRecord`。
9. 第一次完成整个 14 天查询后，把文本 `steps` 加到 `IncludedMetrics` 一次，不要在每天重复添加。

### 动作 7：活动能量 → `activeEnergyKcal`

1. 复制“步数”查询块。
2. 类型改为“活动能量 / Active Energy Burned”。日期仍是 `[DayStart, DayEnd)`。
3. 统计方式仍选“总和”。
4. 加入“转换测量单位 / Convert Measurement”，单位选 `kcal`。
5. 取纯数字；有样本时写入 `activeEnergyKcal`。
6. 把 `activeEnergyKcal` 加入 `IncludedMetrics` 一次。

### 动作 8：锻炼时间 → `exerciseMinutes`

1. 再复制同一查询块。
2. 类型选“Apple 锻炼时间 / Apple Exercise Time”。
3. 日期范围仍为 `[DayStart, DayEnd)`，统计方式选“总和”。
4. 把单位转换为“分钟”。
5. 有样本时写入 `exerciseMinutes`。
6. 把 `exerciseMinutes` 加入 `IncludedMetrics` 一次。

### 动作 9：站立小时 → `standHours`

1. 加入“查找健康样本”，类型选“Apple 站立小时 / Apple Stand Hour”。
2. 日期范围设为 `[DayStart, DayEnd)`。
3. 若系统允许筛选值，选择“已站立 / Stood”。
4. 对结果使用“计数”，得到满足站立条件的小时数。
5. 有可靠结果时写入 `standHours`，并把 `standHours` 加入 `IncludedMetrics`。

注意：不要选择“站立时间 / Stand Time”。它是分钟，不可直接写入 `standHours`。若系统没有可靠的 Stand Hour，就省略此键和 coverage 指标。

### 动作 10：静息心率 → `restingHeartRateBpm`

1. 加入“查找健康样本”，类型选“静息心率 / Resting Heart Rate”。
2. 日期范围设为 `[DayStart, DayEnd)`，优先 Apple Watch 来源。
3. 有多条样本时，用“计算统计数据 → 平均值 / Average”。
4. 单位转换为 `bpm`，取纯数字。
5. 有样本时写入 `restingHeartRateBpm`。
6. 把 `restingHeartRateBpm` 加入 `IncludedMetrics` 一次。

### 动作 11：HRV → `hrvSdnnMs`

1. 复制静息心率查询块。
2. 类型改成“心率变异性 / Heart Rate Variability (SDNN)”。
3. 聚合方式选“平均值”。
4. 单位转换为毫秒 `ms`，取纯数字。
5. 有样本时写入 `hrvSdnnMs`。
6. 把 `hrvSdnnMs` 加入 `IncludedMetrics` 一次。

### 动作 12：睡眠窗口

睡眠按醒来日归属。仍在每日循环里：

1. 对 `DayStart` 减去 `12 小时`，设为 `SleepWindowStart`。
2. 对 `DayStart` 增加 `12 小时`，设为 `SleepWindowEnd`。
3. 建立空列表 `SleepStageSamples`。

### 动作 13：分别查询 Core、Deep、REM 和 Awake

下面的查询块做四次，分类分别选“核心 / Core”“深度 / Deep”“快速眼动 / REM”“清醒 / Awake”：

1. 加入“查找健康样本”，类型选“睡眠分析 / Sleep Analysis”。
2. 日期范围设为 `[SleepWindowStart, SleepWindowEnd)`。
3. 增加“值 / Value”筛选，选择当前分类；优先 Apple Watch 来源。
4. 对结果逐项“获取健康样本的详细信息”，详情选“时长 / Duration”。
5. 把每段时长转换为分钟，再求和。
6. 分别保存为 `CoreMinutes`、`DeepMinutes`、`RemMinutes`、`AwakeMinutes`。
7. Core、Deep、REM 的原始样本加入 `SleepStageSamples`；Awake 不加入实际睡眠阶段列表。

### 动作 14：组装睡眠词典

1. 计算 `CoreMinutes + DeepMinutes + RemMinutes`，设为 `TotalSleepMinutes`。
2. 从 `SleepStageSamples` 获取所有“开始日期”，取最早值，格式化为自定义 `yyyy-MM-dd'T'HH:mm:ssXXX`，设为 `SleepStartISO`。
3. 获取所有“结束日期”，取最晚值，同样格式化，设为 `SleepEndISO`。
4. 如果 `SleepStageSamples` 不为空，建立词典：
   - `start` = `SleepStartISO`
   - `end` = `SleepEndISO`
   - `totalMinutes` = `TotalSleepMinutes`
   - `awakeMinutes` = `AwakeMinutes`
   - `coreMinutes` = `CoreMinutes`
   - `deepMinutes` = `DeepMinutes`
   - `remMinutes` = `RemMinutes`
   - `source` = 健康样本显示的首选来源名称
5. 把该词典写入 `DayRecord` 的 `sleep`。
6. 把 `sleep` 加入 `IncludedMetrics` 一次。

不要把 `In Bed`、旧版 `Asleep` 总计和 Core/Deep/REM 再次相加。阶段重叠或多个来源重复时，结果会明显偏长；优先 Apple Watch，并按时间段去重。

### 动作 15：结束每日记录

在睡眠块之后、但仍在“重复 14 次”内部：

1. 加入“添加到变量 / Add to Variable”。
2. 输入选择 `DayRecord`。
3. 目标变量选择 `DailyRecords`。

然后结束 14 天重复块。

## C. 查询 Workout 和游泳

### 动作 16：查找本次范围内的 Workout

1. 在每日循环之外加入“查找健康样本”。
2. 类型选“体能训练 / Workouts”。
3. 开始日期设为 `RangeStart` 或之后，且在 `TomorrowStart` 之前。
4. 按开始日期升序；关闭数量限制。
5. 把 `workouts` 加入 `IncludedMetrics` 一次。
6. 加入“重复每一项 / Repeat with Each”，输入为查询结果。

### 动作 17：在 Workout 循环中读取基础字段

对“重复项目”依次使用“获取健康样本的详细信息”：

1. 获取“训练类型 / Workout Type”，设为 `WorkoutType`。
2. 获取“开始日期”，设为 `WorkoutStart`。
3. 获取“结束日期”，设为 `WorkoutEnd`。
4. 获取“时长”，转换为分钟，设为 `WorkoutMinutes`。
5. 获取“活动能量”，能取得时转换为 kcal，设为 `WorkoutEnergyKcal`。
6. 获取“总距离 / Total Distance”，能取得时转换为米，设为 `WorkoutDistanceMeters`。
7. 获取“来源名称”和“设备”，能取得时分别设为 `WorkoutSource`、`WorkoutDevice`。

### 动作 18：把类型规范成 FitInsight 可识别文本

加入“如果 / If”分支，把系统本地化名称映射到以下英文值：

- 泳池游泳 → `Pool Swimming`
- 公开水域游泳 → `Open Water Swimming`
- 传统力量训练 → `Traditional Strength Training`
- 功能性力量训练 → `Functional Strength Training`
- 跑步 → `Running`
- 步行 → `Walking`

其他类型可把系统文本原样放进 `rawType`；FitInsight 会安全归类为“其他”，并在导入预览显示提示。

### 动作 19：组装每条 Workout

1. 格式化 `WorkoutStart` 为 `yyyy-MM-dd`，设为 `WorkoutLocalDate`。
2. 再把开始和结束日期格式化为 `yyyy-MM-dd'T'HH:mm:ssXXX`。
3. 建立词典，写入：
   - `rawType`
   - `localDate`
   - `start`
   - `end`
   - `durationMinutes`
4. 只有实际取得时，再写入 `activeEnergyKcal`、`distanceMeters`、`source`、`device`。
5. 第一版省略 `heartRateSamples`、平均/最高心率和 `swimmingStrokeCount`；不要用平均值伪造逐点心率。
6. 用“添加到变量”把词典加入 `Workouts`。

FitInsight 会根据这些字段生成稳定训练 ID；快捷指令中不要创建 `id`。

## D. 查询体重和体脂

### 动作 20：体重 → `weightKg`

1. 加入“查找健康样本”，类型选“体重 / Body Mass”。
2. 日期范围设为 `[RangeStart, TomorrowStart)`，按开始日期升序。
3. 加入“重复每一项”。
4. 对每项取得“开始日期”和“值”，把值转换为 kg。
5. 建立词典：`date`、`measuredAt`、`weightKg`，以及可选 `source`。
6. `date` 使用 `yyyy-MM-dd`，`measuredAt` 使用 `yyyy-MM-dd'T'HH:mm:ssXXX`。
7. 把词典加入 `BodyMeasurements`。
8. 把 `weightKg` 加入 `IncludedMetrics` 一次。

### 动作 21：体脂率 → `bodyFatPercentage`

1. 复制体重查询块，类型改为“体脂率 / Body Fat Percentage”。
2. FitInsight 需要 `28.9` 这种 0–100 数字，不是 `0.289`。用“快速查看”确认；若系统给出 0–1 小数，乘以 100。
3. 建立独立词典：`date`、`measuredAt`、`bodyFatPercentage` 和可选 `source`。
4. 把词典加入 `BodyMeasurements`。
5. 把 `bodyFatPercentage` 加入 `IncludedMetrics` 一次。

体重和体脂可以是两条不同测量记录，FitInsight 会按时间合并到趋势中。不要在快捷指令中创建数据库字段 `key`。

## E. 组装最终 JSON

### 动作 22：建立 coverage

加入“词典”，填写：

- `startDate` = `CoverageStartDate`
- `endDate` = `CoverageEndDate`
- `includedMetrics` = `IncludedMetrics`
- `mode` = `patch`

设为变量 `Coverage`。

### 动作 23：格式化生成时间

1. 加入“格式化日期”，输入 `GeneratedAtDate`。
2. 使用自定义格式 `yyyy-MM-dd'T'HH:mm:ssXXX`。
3. 设为变量 `GeneratedAtISO`。

### 动作 24：建立顶层词典

加入“词典”，填写：

- `schemaVersion` = `1.0.0`
- `generatedAt` = `GeneratedAtISO`
- `timezone` = `Asia/Shanghai`
- `source` = `FitInsight Shortcut`
- `coverage` = `Coverage`
- `dailyRecords` = `DailyRecords`
- `workouts` = `Workouts`
- `bodyMeasurements` = `BodyMeasurements`

不要加入 `profile`，也不要加入顶层 `synthetic`。

### 动作 25：转成 JSON 文本并检查

1. 加入“获取输入中的文本 / Get Text from Input”，输入为顶层词典。
2. 把结果设为 `HealthJSON`。
3. 加入“快速查看 / Quick Look”。
4. 第一次运行时确认：文本以 `{` 开头，三个集合是数组，数字没有 `步`、`kg`、`kcal` 等单位后缀，时间含 `+08:00` 或其他偏移。

## F. 保存固定文件并打开 FitInsight

### 动作 26：创建目标文件夹

1. 加入“创建文件夹 / Create Folder”。
2. 服务选择 `iCloud Drive`。
3. 路径选择或填写 `Shortcuts/FitInsight`。
4. 已存在时继续，不要删除旧文件夹。

### 动作 27：保存 JSON

1. 加入“设定名称 / Set Name”，输入选择 `HealthJSON`。
2. 名称填 `fitinsight-health.json`。
3. 加入“存储文件 / Save File”。
4. 服务选择 `iCloud Drive`，目标文件夹选择 `Shortcuts/FitInsight`。
5. 关闭“询问存储位置 / Ask Where to Save”。
6. 打开“覆盖已存在文件 / Overwrite If File Exists”。

最终路径应为：

`iCloud Drive/Shortcuts/FitInsight/fitinsight-health.json`

该文件是敏感明文，并会由 Apple iCloud 同步。若不希望上云，可改存“在我的 iPhone 上”，但网页导入步骤不变。

### 动作 28：自动打开 FitInsight

1. 加入“URL”，内容选择变量 `FitInsightURL`。
2. 加入“打开 URL / Open URLs”。
3. 把这两个动作放在“存储文件”之后。

运行完成后，FitInsight 会打开；再点“同步 → 选择健康数据”，选择刚保存的 `fitinsight-health.json`，检查预览后点“确认导入”。浏览器安全限制不允许快捷指令自动替你选中这个文件。

## 最小验证版：先用 1 天步数跑通

完整快捷指令较长。第一次建议只保留：

1. `TodayStart` 和 `TomorrowStart`；
2. 一次“查找步数 → 总和”；
3. 一个只含 `date` 和 `steps` 的 DailyRecord；
4. `includedMetrics` 只写 `steps`；
5. `workouts`、`bodyMeasurements` 为空列表；
6. 相同的顶层词典、保存文件和打开 URL 动作。

先在 FitInsight 看到正确步数和无警告预览，再把回补范围扩到 14 天，并依次加入能量、锻炼、站立、心率、HRV、睡眠、Workout、体重和体脂。公开的 [`sample-realistic-health.json`](../public/examples/sample-realistic-health.json) 可用于对照最终字段结构；它包含 30 条每日记录、16 条训练和 8 条身体测量，且全部为合成数据。

## 日常使用

1. 打开“快捷指令”，运行 `FitInsight 同步`。
2. 等待文件保存并自动打开 FitInsight。
3. 点“同步”。
4. 点“选择健康数据”。
5. 选择 `iCloud Drive/Shortcuts/FitInsight/fitinsight-health.json`。
6. 检查新增、更新、跳过和警告数量。
7. 点“确认导入”。

每次回补最近 14 天可以吸收 Apple Watch 延迟写入和跨夜睡眠修正；FitInsight 的 `patch` 导入会用非空新值更新同一天，而不会把缺失字段强行清零。

## 常见问题

- **全部为空**：检查健康权限、日期范围和来源筛选；未成功查询的指标不要写进 `includedMetrics`。
- **步数或能量约为两倍**：通常同时累加了 iPhone、Apple Watch 或第三方 App；优先一个来源。
- **睡眠异常过长**：不要把 In Bed、Asleep 总计和 Core/Deep/REM 重复相加。
- **站立像几百分钟**：选成了 Stand Time；应使用 Stand Hour 的满足小时数。
- **训练被跳过**：检查 `localDate` 是否为 `yyyy-MM-dd`，`start` 是否含时区偏移。
- **体脂显示 0.289%**：系统返回了 0–1 小数，写 JSON 前需乘以 100。
- **游泳距离为 0**：取不到时省略或写空值，不要用 0 假装已知。
- **导入预览数量异常**：先关闭面板，不要确认；用“快速查看”检查三个数组和 coverage。
- **后台运行暂停**：健康、文件和打开 URL 动作可能要求解锁或首次确认，这是 iOS 的隐私限制。
