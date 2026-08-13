# FitInsight

FitInsight 是一个中文、本地优先的健康与训练分析 PWA。它读取用户明确选择的 FitInsight JSON，把每日活动、睡眠、训练和身体测量保存在浏览器 IndexedDB，并在本机生成 Today 建议、趋势、周报和月报。没有账户、服务器上传、遥测或 AI API。

## 本地开发

需要支持当前 Vite/React 的 Node.js 与 npm。

```bash
npm install
npm run dev
```

常用验证：

```bash
npm test
npm run build
```

还可运行 `npm run format:check`、`npm run lint`、`npm run typecheck` 和 `node scripts/verify-pwa.mjs`。`npm run build` 生成静态站点到 `dist/`。

## 第一次使用与导入

1. 打开 Today。没有数据时会显示空状态，不会把未知值显示为零。
2. 点“同步”，运行你手动创建的“FitInsight 同步”快捷指令，或直接点“选择 JSON 文件”。
3. 选择 JSON 后先检查新增/更新/跳过数量；预览阶段不会写数据库。
4. 点“确认导入”。成功后 Today 立即刷新；重新载入页面后数据仍由 IndexedDB 提供。
5. 到“我的”在本机填写个人资料和目标。资料可留空；缺少目标或基线时，相关评分和心率区间会诚实显示数据不足。

公开的 [`public/examples/sample-realistic-health.json`](public/examples/sample-realistic-health.json) 是完全合成、经生产 parser 验证为零警告的 30 天快捷指令格式样例，可用于现场验证导入、训练、趋势和回顾。生产数据格式见 [`docs/data-schema.md`](docs/data-schema.md)，iPhone 快捷指令逐动作步骤见 [`docs/shortcuts-setup-zh.md`](docs/shortcuts-setup-zh.md)。

## 在 iPhone 安装 FitInsight

FitInsight 地址为 `https://1045126944-droid.github.io/fitinsight/`。安装步骤：

1. Safari 打开上面的 HTTPS FitInsight 地址。
2. 点击“分享”。
3. 选择“添加到主屏幕”。
4. 开启“作为 Web App 打开”（如果当前 iOS 显示）。
5. 点击“添加”。
6. 回到桌面，打开 FitInsight。

不需要 Xcode、Apple Developer 账号或 App Store。请务必在最终 HTTPS 地址上导入个人数据；浏览器会按网站地址隔离本地数据，换地址后不会自动搬迁 IndexedDB。

## 更新与离线

在线打开一次生产构建后，Service Worker 会缓存应用 shell、图标和合成示例。之后离线重新打开时，界面与已有 IndexedDB 数据仍可读取；离线期间不能取得未缓存的外部资源。

发现新版本时应用显示“有新版本”。页面不会自动刷新；点“立即更新”才应用 waiting worker 并刷新，或点“稍后”继续当前版本。

Service Worker 在部署环境必须使用 HTTPS（`localhost` 本地开发例外）；普通 HTTP 站点不能获得可靠离线能力。

## 备份、恢复和清除

- **备份**：“我的 → 本地数据管理 → 导出本地数据备份”，阅读敏感明文警告，再继续下载 `fitinsight-local-backup.json`。
- **恢复**：选择备份文件，核对每日/训练/身体测量/导入历史数量，再点“确认替换并恢复”。恢复会替换当前全部本地数据库。
- **取消清除**：点“清除全部本地数据”后可点“取消”或按 Escape，不发生删除。
- **确认清除**：再次点“清除全部本地数据”会清空 IndexedDB，并尝试移除 FitInsight 的四项界面偏好。它不会删除“文件”、下载目录或 iCloud Drive 中的 JSON，也不会移除 Service Worker 离线缓存。

备份是未加密的敏感 JSON。Safari/系统也可能因用户清除网站数据、存储压力、隐私策略、无痕会话结束或站点来源改变而清除 IndexedDB；添加到主屏幕不代替备份。完整边界见 [`docs/privacy.md`](docs/privacy.md)。

## GitHub Pages 发布

仓库已包含 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)。推送到 GitHub 的 `main` 后，它会自动安装依赖、构建 `dist/` 并发布到 GitHub Pages；相对 `base`、manifest、Service Worker 和静态资源可同时适配用户站点与仓库子路径。

首次发布只需在 GitHub 仓库执行一次：进入 **Settings → Pages**，将 **Build and deployment → Source** 设为 **GitHub Actions**。随后在 **Actions → Deploy FitInsight to GitHub Pages** 查看运行结果和最终 `https://…github.io/…/` 地址。

每次发布后，已打开的旧页面会显示更新提示；FitInsight 不会强制刷新用户正在查看的版本。

## 仓库隐私规则

只提交代码、文档和明确标注的合成 fixture。不要提交真实姓名、生日、身体数值、Apple Health 时间线、导入 JSON、下载的备份、浏览器截图或环境秘密。临时文件放在被忽略的 `work/`、`private/`、`private-data/`，或使用 `*.private.json`；提交前运行 `git status --short` 并人工审查 staged diff。若在 iCloud Drive 保存文件，数据会由 Apple 同步，不再只在当前设备。

## 项目结构

```text
src/app/                 应用状态、偏好和页面组装
src/components/          Shell、底部导航、更新提示等共享组件
src/features/import/     不可信 JSON 解析、预览和事务导入
src/features/analysis/   基线、评分、趋势、周报/月报规则
src/features/dashboard/  Today 与行动建议
src/features/workouts/   训练列表、筛选和详情
src/features/trends/     7/30/90 天趋势
src/features/reviews/    周报、月报和导出
src/features/profile/    本机资料、目标、备份/恢复/清除
src/db/                  IndexedDB、patch 合并和备份验证
src/pwa/                 Service Worker 注册与更新策略
public/examples/         公开的完全合成示例
docs/                    数据、算法、隐私、Shortcut 和设计资料
scripts/verify-pwa.mjs   生产 PWA 构建检查
```

## 测试覆盖

Vitest 覆盖 production parser、未知≠零与 patch 合并、IndexedDB 原子事务、备份验证、个人基线、活动/睡眠/恢复/周结构评分、建议门槛、心率区间、游泳配速、体重趋势、趋势 gap、周/月部分周期比较，以及主要 React 页面、对话框焦点和 PWA 更新提示。构建门还包括 Prettier、ESLint、TypeScript、生产 build、PWA 产物验证、console 扫描和浏览器三视口/离线/更新 QA。

算法细节见 [`docs/analysis-rules.md`](docs/analysis-rules.md)。

## 非医疗声明

本系统基于 Apple 健康、Apple Watch 及用户录入数据生成，仅供个人健身与生活方式参考，不构成医疗诊断或治疗建议。
