# 朝暮田事 · 后端

API 入口是 `cloudflare/src/index.js`。管理后台使用同域名的 `/manage` 路径。云端数据使用 D1，图鉴高清图使用 Worker 静态资源。

使用 Node.js 22 或以上运行 `npm test`，可在内存 SQLite 中验证权限、反馈、照片审核和发布。设置 Wrangler 配置中的 D1 数据库 ID 和天气主机，再通过 Worker Secrets 配置其他敏感值。检查目标环境并应用迁移后，可以执行 `npm run deploy`。

管理员的登录凭据随部署单独交接。只保存在手机本机的田地与日记还未同步到云端。后台用户页展示服务器已收到的数据。

`main` 保存稳定版本。`develop` 用于日常开发，功能分支通过测试和审查后合并。按版本标签归档，变动记录在 [版本记录](./CHANGELOG.md)。

[小程序仓库](https://github.com/1196185392/mp_zmts)
