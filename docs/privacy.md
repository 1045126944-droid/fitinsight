# FitInsight 隐私说明

## 本地优先

FitInsight 没有账户、服务器上传、遥测、广告 SDK 或 AI API。应用不会自行访问 HealthKit；只有你在“文件”选择器中明确选择的 JSON 才会被浏览器读取，解析和分析均在当前设备完成。

## 本机存储范围

健康日记录、训练、身体测量、导入历史、数据库状态和个人资料保存在当前网站来源（协议、域名、端口组合）对应的 IndexedDB 数据库 `fitinsight`。外观、当前标签、每周开始日和新手引导状态这四项界面偏好保存在同一来源的 `localStorage`。

浏览器或系统可能因“清除网站数据”、隐私设置、存储压力、来源地址变化、无痕会话结束或系统策略而清除本地存储。安装到主屏幕不等于永久备份；重要数据应保留原始 Shortcut 文件并定期导出备份。

## 备份是敏感明文

“导出本地数据备份”生成未加密 JSON，包含健康数据、规范化训练/测量、导入历史和本机个人资料。任何能读取文件的人或服务都可能看到内容。请只保存在受信任、受设备密码和账户保护的位置；不要提交到 Git、上传到问题单或分享给不信任的人。

选择备份后，FitInsight 会先在本机验证并显示条数；只有再次确认才用一个 IndexedDB 事务替换当前全部数据库内容。备份版本与导入 schema 是两种不同格式，不可互换。

## iCloud Drive 的现实

如果 Shortcut 或 Safari 把 JSON/备份保存到 iCloud Drive，文件会由 Apple 的 iCloud 服务在你的设备和账户之间同步；这不再是“仅留在当前设备”的存储。FitInsight 不控制 iCloud 的传输、保留、共享链接、其他已登录设备或已删除文件恢复。需要严格本地保存时选择“在我的 iPhone 上”，并自行管理“文件”App 中的副本。

## Service Worker 缓存

Service Worker 只预缓存生产 shell（HTML、JavaScript、CSS）、应用图标和公开的完全合成示例 `examples/sample-health-data.json`，没有运行时网络缓存规则。导入的健康 JSON、导出的备份、IndexedDB 数据和个人资料不会写入 Service Worker Cache Storage，也不会发送到网络。缓存仍属于该网站来源，用来支持离线打开界面。

## 清除及其边界

应用内“清除全部本地数据”会清空 IndexedDB 中的健康数据、个人资料、导入历史和状态，并尝试移除 FitInsight 自己的四项 `localStorage` 偏好。它不会清除：

- 你已保存到“文件”、下载目录、iCloud Drive 或其他应用的原始/备份 JSON；
- Service Worker 和离线 shell 缓存；
- 浏览器、系统备份、同步服务或他人设备中的副本。

若要移除离线 shell，需在 Safari/系统的网站数据设置中删除对应来源或移除站点数据。执行前先确认是否需要备份，因为这些操作也可能删除 IndexedDB。

## 仓库数据规则

仓库只允许完全合成的公开 fixture。真实姓名、生日、身体数值、Apple Health 时间线、导入文件、浏览器下载和备份不得提交；使用 `work/`、`private/`、`private-data/` 或 `*.private.json` 等被忽略位置做本地临时工作，并在暂存前人工检查 diff。

## 非医疗声明

本系统基于 Apple 健康、Apple Watch 及用户录入数据生成，仅供个人健身与生活方式参考，不构成医疗诊断或治疗建议。
