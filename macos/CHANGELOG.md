# Changelog

## 1.2.0 — 2026-07-16

### 新增

- Apple Silicon 图形化管理器「Codex 换肤助手」：Electron + React，使用 DMG 分发
- 四步首次引导：环境检测、Engine 安装与备份、主题选择、确认应用
- 主窗口与原生菜单栏入口：概览、主题库、智能编辑、诊断、恢复、设置和关于
- 安全的 `.codexskin` 导入导出，仅允许受控 JSON 与单张图片
- 主题 schema v2：图片焦点、亮度、遮罩强度与自动配色
- 机器可读 Engine CLI、稳定错误码、操作互斥与崩溃 journal

### 改进

- 修复默认主题引用未入库图片导致的新安装和 doctor 失败
- 修复 Electron 开发模式把整个 `macos/` 源码树误当作 Engine，导致安装时报清单文件数量不匹配
- 开发态与 DMG 统一使用由 SHA-256 清单生成的最小 Engine 暂存目录，避免筛选规则漂移
- CDP 等待不再接受无法确认归属的软匹配端口
- 热重应用、暂停和旧会话接管会同时校验 PID、启动时间、Node/脚本路径、端口与 Codex 进程归属
- 完整恢复会保留配置备份，直到普通模式 Codex 成功重启
- 图形化安装沿用旧 Engine、主题和状态目录，可接管已有脚本版数据
- 旧版 v1 主题会通过 `migrate` 转换为 v2；已安装 Engine 会按 SHA-256 清单检查完整性

### 安全

- Renderer 开启隔离与沙盒，不暴露 Node、文件系统或原始 IPC
- App 不加载远程页面；系统操作仅通过白名单、参数校验后的 Main Process 接口
- `.codexskin` 在解压前限制文件数量与原始大小，并拒绝脚本、CSS 和路径穿越
- “清除全部数据”必须存在成功恢复并卸载 Engine 的回执，失败时保留主题与备份
- 不修改官方 `.app`、`app.asar`、签名、API Key 或 Base URL

---

## 1.1.1 — 2026-07-16

### 修复

- 不再用 `launchctl submit` 托管带调试口的 Codex：退出 SwiftBar / 关掉 Codex 后不应再被 launchd 自动拉起
- 暂停与完全恢复时清理 `com.openai.codex-dream-skin-studio.app` 作业

---

## 1.1.0 — 2026-07-16

### 新增

- SwiftBar 菜单栏入口（`Install Menu Bar.command`）：应用 / 暂停 / 换图 / 切换已保存主题 / 从图片文件夹加载 / 完全恢复
- 主题库（`themes/`）与图片投放目录（`images/`）动态加载，不再把 README 图库合成图当背景素材
- 按 Codex 应用浅色 / 深色自动切换皮肤壳（`data-dream-shell`）

### 改进

- CDP 已就绪时热切换主题（重启 injector + 短时注入），换图更快
- 注入校验放宽（项目选择器等可选），避免误杀已生效皮肤
- 注入守护优先 `nohup`；暂停状态与路径大小写下停止逻辑更稳
- 安装时不再强制 `appearanceTheme=dark`，只备份桌面外观相关键，便于恢复与自动适配

### 视觉

- 以原版暗色 portal CSS 为结构底，叠加 light 壳与更薄横幅遮罩，减轻「换图看不清」
- 示例纯横幅：`docs/images/banner-arina-hashimoto-pure-no-ui.png`（无人机 UI 合成）

### 说明

- `docs/images/gallery/` 仅为效果预览，不要当 `theme` 背景导入

---

## 1.0.0 — 2026-07-15

- 发布 macOS 通用主题制作器，而不是固定角色皮肤。
- 加入 Finder 选图、自动 JPEG 转换、主题命名和高级配色参数。
- 主页使用独立横幅，任务页使用背景与磨砂层，完整保留原生交互。
- 改为复用并验证 Codex 官方签名 Node.js，不再附带大型运行时或依赖全局 Node。
- 增加独立安装目录、桌面启动/定制/验证/恢复入口。
- 增加官方签名、CDP 端口归属、PID 身份、刷新重注入和真实 DOM 自检。
- 增加原子配置备份、精确恢复、静态测试、安装恢复循环和发布打包脚本。
- 清理固定角色内部命名；传送门主题仅作为可替换示例素材。
- 开源树：示例横幅改为无角色抽象几何图；验收截图不入库；补充 NOTICE / README 商标与安全边界说明。
