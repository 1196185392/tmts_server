# 朝暮田事 API 模板

运行：`node backend/server.cjs`。默认只监听本机 `127.0.0.1:8787`。运行 `npm run test:api` 可验证健康检查、植物查询和未配置服务时的安全响应。

接口：

- `GET /health`：健康检查。
- `POST /v1/auth/wechat`：接收小程序 `wx.login()` 的 `code`，由服务端调用微信 `code2Session`。
- `GET /v1/context/weather?lat=&lon=`：由服务端转发和风天气实况并统一成小程序需要的字段。
- `GET /v1/plants?query=&category=`：当前返回原型内的审核前示例资料，便于前后端联调。

先复制 `.env.example` 的变量到部署平台的密钥管理中。不要提交真实环境变量，不要直接把服务监听在公网，也不要把 `WECHAT_APP_SECRET`、`QWEATHER_API_KEY` 或 `AUTH_SECRET` 放入 `miniprogram/`。

上线前还需要：持久化用户与会话、令牌校验/轮换、速率限制、日志脱敏、天气缓存、植物资料审核版本、图片存储和社区审核/举报流程。社区端点现在故意返回 `501`，避免未完成审核时提前开放公开内容。
