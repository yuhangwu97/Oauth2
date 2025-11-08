# OAuth2 第三方登录集成文档

---

## 功能概述

OAuth2 第三方登录功能允许用户使用 Google 或 Apple 账号快速登录系统，无需注册新账号。系统会自动创建或绑定用户账号，并返回 JWT Token 用于后续 API 调用。

### 支持的登录提供商

- **Google** - Google 账号登录
- **Apple** - Apple ID 登录

---

## OAuth2 登录流程

### 整体流程说明

1. **获取提供商列表** - 前端调用 `GET /api/sys/user/oauth2/providers` 接口，获取白名单提供商列表（`whitelistProviders`）
2. **检查白名单** - 前端只显示 `whitelistProviders` 中的提供商，不显示 `allProviders` 中但不在白名单的提供商
3. **前端发起授权请求** - 用户点击第三方登录按钮，前端调用后端授权接口，获取授权 URL
4. **跳转到授权页面** - 前端跳转到 OAuth 提供商的授权页面（Web 直接跳转，App 使用 WebView）
5. **用户授权** - 用户在 OAuth 提供商页面完成授权
6. **回调处理** - OAuth 提供商回调后端接口，后端完成用户信息获取和账号创建
7. **重定向返回** - 后端重定向到前端成功/失败页面，携带 Token 或错误信息
8. **前端处理结果** - 前端接收 Token，保存并跳转到应用首页

**重要说明**：
- 前端只显示白名单（`whitelistProviders`）中的提供商，例如：如果后端配置了 `google,apple,facebook,twitter,instagram` 但白名单只有 `google,apple`，则前端只显示 Google 和 Apple 的登录按钮
- 如果获取提供商列表失败，前端应静默处理，不显示第三方登录按钮，但不影响正常的登录和注册界面
- 后端新增 provider 时，只需将其添加到 `providers-whitelist` 配置，前端会自动显示，无需修改前端代码

### 流程图

```
前端应用
  ↓
1. 获取提供商列表 GET /api/sys/user/oauth2/providers
  ↓
2. 检查 whitelistProviders，只显示白名单中的提供商
  ↓
3. 用户点击第三方登录按钮
  ↓
4. 调用授权接口 POST /api/sys/user/oauth2/authorize
  ↓
5. 获取授权URL
  ↓
6. 跳转到授权URL（Web浏览器 / App WebView）
  ↓
7. 用户在OAuth提供商页面授权
  ↓
8. OAuth提供商回调后端 GET /api/sys/user/oauth2/callback/{provider}
  ↓
9. 后端处理：交换Token → 获取用户信息 → 创建/绑定账号 → 生成JWT
  ↓
10. 后端重定向到前端页面（成功：/oauth2/success?token=xxx，失败：/login?error=xxx）
  ↓
11. 前端接收Token，保存并跳转
```

**流程说明**：
- 步骤 1-2：前端先获取提供商列表，只显示 `whitelistProviders` 中的提供商
- 如果步骤 1 失败，前端不显示第三方登录按钮，但不影响正常的登录和注册界面
- 步骤 3-11：正常的 OAuth2 授权流程

---

## API 接口说明

### 1. 获取 OAuth2 支持的提供商列表接口

#### 接口说明
获取后端配置的所有支持的 OAuth2 提供商列表和白名单提供商列表。前端可以使用此接口动态获取可用的登录提供商，而不需要硬编码。

#### 接口地址
```
GET /api/sys/user/oauth2/providers
```

#### 请求参数
无

#### 返回数据格式

**成功响应**
```json
{
  "success": true,
  "message": "获取成功",
  "code": 200,
  "result": {
    "allProviders": ["google", "apple", "facebook", "twitter", "instagram"],
    "whitelistProviders": ["google", "apple"]
  },
  "timestamp": 1234567890
}
```

**字段说明**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `allProviders` | Array<String> | 所有支持的提供商列表，从配置 `app.oauth2.providers-list` 读取 |
| `whitelistProviders` | Array<String> | 白名单提供商列表（实际启用的提供商），从配置 `app.oauth2.providers-whitelist` 读取 |

#### 业务逻辑说明

1. **allProviders**：返回后端配置的所有支持的提供商列表，这些是系统理论上支持的所有提供商（如：`google,apple,facebook,twitter,instagram`）
2. **whitelistProviders**：返回实际启用的提供商列表（白名单），这些是当前可以使用的提供商
3. **前端显示逻辑**：
   - **前端只显示 `whitelistProviders` 中的提供商**，不显示 `allProviders` 中但不在白名单的提供商
   - 例如：如果 `allProviders` 包含 `["google", "apple", "facebook", "twitter", "instagram"]`，但 `whitelistProviders` 只有 `["google", "apple"]`，则前端只显示 Google 和 Apple 的登录按钮
   - 如果后端新增了 provider（如 Facebook），只需将其添加到 `providers-whitelist` 配置中，前端会自动显示，无需修改前端代码
4. **配置说明**：
   - `app.oauth2.providers-list`：所有支持的提供商，用逗号分隔，如：`google,apple,facebook,twitter,instagram`
   - `app.oauth2.providers-whitelist`：实际启用的提供商（白名单），用逗号分隔，如：`google,apple`
5. **错误处理**：
   - 如果获取提供商列表失败（网络错误、接口异常等），前端应静默处理，不显示任何第三方登录按钮
   - **重要**：获取提供商列表失败不应影响正常的登录和注册界面，用户仍可使用账号密码登录
   - 前端应异步获取提供商列表，不阻塞页面渲染

---

### 2. OAuth2 授权接口

#### 接口说明
获取 OAuth2 授权 URL，用于跳转到第三方登录页面。前端需要生成 state 参数用于防 CSRF 攻击。

**重要说明**：`redirectUri` 由后端自动拼接生成，前端不需要传递。后端会根据 `redirect-uri-base` 配置和 `provider` 自动拼接回调地址，格式为：`{redirect-uri-base}/{provider}`。

#### 接口地址
```
POST /api/sys/user/oauth2/authorize
```

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `provider` | String | 是 | 登录提供商：`"google"` 或 `"apple"` |
| `state` | String | 是 | 状态参数，用于防止 CSRF 攻击，建议使用随机字符串 |

#### 请求示例
```json
{
  "provider": "google",
  "state": "random_state_string_12345"
}
```

#### 返回数据格式

**成功响应**
```json
{
  "success": true,
  "message": "操作成功",
  "code": 200,
  "result": {
    "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&state=...",
    "state": "random_state_string_12345"
  },
  "timestamp": 1234567890
}
```

**失败响应**
```json
{
  "success": false,
  "message": "Provider不能为空",
  "code": 500,
  "result": null,
  "timestamp": 1234567890
}
```

#### 业务逻辑说明

1. **State 参数生成**：前端需要生成一个随机字符串作为 state 参数，建议使用 UUID 或随机字符串生成器
2. **RedirectUri 自动拼接**：`redirectUri` 由后端自动拼接生成，不需要前端传递。后端会根据 `redirect-uri-base` 配置和 `provider` 自动拼接，格式为：`{redirect-uri-base}/{provider}`。例如：如果 `redirect-uri-base` 为 `http://localhost:9080/api/sys/user/oauth2/callback`，则 Google 的回调地址为 `http://localhost:9080/api/sys/user/oauth2/callback/google`
3. **State 存储**：后端会将 state 数据存储到 Redis，有效期 5 分钟，用于回调时验证

---

### 3. OAuth2 回调接口（后端内部使用）

#### 接口说明
此接口由 OAuth 提供商（Google/Apple）直接调用，前端不需要直接调用。后端处理完授权码后，会重定向到前端页面。

#### 接口地址
```
GET /api/sys/user/oauth2/callback/{provider}
```

#### 回调参数（由 OAuth 提供商传递）

| 参数名 | 类型 | 说明 |
|--------|------|------|
| `code` | String | 授权码，由 OAuth 提供商返回 |
| `state` | String | 状态参数，用于验证请求的合法性 |

#### 后端处理流程

1. **验证 State**：从 Redis 中获取 state 数据，验证请求的合法性
2. **交换访问令牌**：使用授权码向 OAuth 提供商交换访问令牌（Access Token）
3. **获取用户信息**：使用访问令牌获取用户的个人信息（ID、邮箱、姓名、头像等）
4. **创建/绑定账号**：
   - 如果用户已存在（通过第三方账号 ID 查找），则直接绑定
   - 如果用户不存在，则创建新用户和第三方账号绑定
   - 如果提供了邮箱且邮箱已注册，则绑定到现有账号
5. **生成 JWT Token**：为用户生成 JWT Token，用于后续 API 调用
6. **重定向返回**：
   - 成功：重定向到 `{前端域名}/oauth2/success?token={jwt_token}`
   - 失败：重定向到 `{前端域名}/login?error={错误信息}`

#### 重定向地址说明

**成功重定向**
```
https://your-frontend-domain.com/oauth2/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**失败重定向**
```
https://your-frontend-domain.com/login?error=invalid_state
https://your-frontend-domain.com/login?error=Failed to exchange token
```

---

## Web 端集成步骤

### 1. 准备工作

- 确认后端已配置 OAuth2 提供商（Google/Apple）的客户端 ID 和密钥
- 确认后端已配置回调地址基础路径（`app.oauth2.redirect-uri-base`），后端会自动拼接 provider 生成完整回调地址
- 准备前端成功页面路由：`/oauth2/success`
- 准备前端失败处理页面路由：`/login`

### 2. 获取可用的提供商列表（必需）

**获取提供商列表**：
- 调用 `GET /api/sys/user/oauth2/providers` 接口获取可用的提供商列表
- **只使用返回的 `whitelistProviders` 动态渲染登录按钮**，不显示 `allProviders` 中但不在白名单的提供商
- 这样可以避免硬编码提供商列表，后端配置变更时前端自动适配
- **重要**：如果获取失败，应静默处理，不显示第三方登录按钮，但不影响正常的登录和注册界面

**示例代码**：
```javascript
// 获取可用的提供商列表（静默获取，失败不影响页面）
useEffect(() => {
  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/sys/user/oauth2/providers');
      const data = await response.json();
      // 只使用 whitelistProviders，只显示实际启用的提供商
      const whitelistProviders = data.result?.whitelistProviders || [];
      setProviders({ whitelistProviders });
    } catch (error) {
      console.error('获取 OAuth2 提供商列表失败（不影响正常登录）:', error);
      // 获取失败时，不显示任何第三方登录按钮，不影响正常登录界面
      setProviders({ whitelistProviders: [] });
    }
  };
  
  // 异步获取，不阻塞页面渲染
  fetchProviders();
}, []);

// 只渲染 whitelistProviders 中的提供商
{providers.whitelistProviders && providers.whitelistProviders.length > 0 && (
  <div className="login-buttons">
    {providers.whitelistProviders.map((provider) => (
      <button key={provider} onClick={() => handleLogin(provider)}>
        使用 {provider} 登录
      </button>
    ))}
  </div>
)}
```

**关键要点**：
1. **只显示白名单提供商**：前端只渲染 `whitelistProviders` 中的提供商，不显示 `allProviders` 中但不在白名单的提供商
2. **错误容错**：获取提供商列表失败时，不显示第三方登录按钮，但不影响正常的登录和注册功能
3. **动态支持**：后端新增 provider 时，只需将其添加到 `providers-whitelist` 配置，前端会自动显示，无需修改前端代码
4. **不阻塞渲染**：异步获取提供商列表，初始状态不阻塞页面渲染

### 3. 生成 State 参数

**State 生成**：
- 生成一个随机字符串（建议使用 UUID 或 32 位随机字符串）
- 可以存储在 sessionStorage 中，用于后续验证

### 4. 调用授权接口

1. 构建请求参数：
   - `provider`: 选择 `"google"` 或 `"apple"`
   - `state`: 生成的随机 state
   
   **注意**：`redirectUri` 不需要传递，由后端根据 `redirect-uri-base` 和 `provider` 自动拼接。

2. 发送 POST 请求到 `/api/sys/user/oauth2/authorize`

3. 获取返回的 `authorizationUrl`

### 5. 跳转到授权页面

- 使用 `window.location.href` 跳转到获取到的 `authorizationUrl`
- 或者在新窗口打开（使用 `window.open`），但需要注意回调处理

### 6. 处理回调结果

**成功页面处理**（`/oauth2/success`）：
1. 从 URL 参数中获取 `token`：`?token=xxx`
2. 将 Token 保存到本地存储（localStorage 或 sessionStorage）
3. 将 Token 添加到后续 API 请求的 Header 中（通常为 `Authorization: Bearer {token}`）
4. 跳转到应用首页或用户中心

**失败页面处理**（`/login`）：
1. 从 URL 参数中获取 `error`：`?error=xxx`
2. 根据错误信息提示用户：
   - `invalid_state`: State 验证失败，可能是请求已过期，请重新登录
   - `Failed to exchange token`: Token 交换失败，请重试
   - 其他错误：显示具体错误信息
3. 提供重新登录的按钮

### 7. 前端需要做的事情

- ✅ （可选）调用提供商列表接口获取可用的登录提供商
- ✅ 生成随机 state 参数
- ✅ 调用授权接口获取授权 URL
- ✅ 跳转到授权 URL
- ✅ 创建成功页面路由 `/oauth2/success`，处理 Token 保存
- ✅ 创建失败处理逻辑，显示错误信息
- ✅ 将 Token 保存到本地存储
- ✅ 在后续 API 请求中携带 Token

---

## App 端集成步骤（使用 WebView）

### 1. 准备工作

- 确认后端已配置 OAuth2 提供商（Google/Apple）的客户端 ID 和密钥
- 确认后端已配置回调地址基础路径（`app.oauth2.redirect-uri-base`），后端会自动拼接 provider 生成完整回调地址
- 准备 App 内 WebView 组件
- 准备深度链接（Deep Link）或 URL Scheme 用于回调处理

### 2. 获取可用的提供商列表（必需）

- 调用 `GET /api/sys/user/oauth2/providers` 接口获取可用的提供商列表
- **只使用返回的 `whitelistProviders` 动态渲染登录按钮**，不显示 `allProviders` 中但不在白名单的提供商
- 如果获取失败，应静默处理，不显示第三方登录按钮，但不影响正常的登录和注册界面

### 3. 生成 State 参数

与 Web 端相同：
- 生成随机 state 参数

### 4. 调用授权接口

与 Web 端相同，调用 `/api/sys/user/oauth2/authorize` 获取授权 URL。注意：`redirectUri` 不需要传递，由后端根据 `redirect-uri-base` 和 `provider` 自动拼接。

### 5. 在 WebView 中打开授权页面

**关键步骤**：
1. 在 App 内打开 WebView
2. 加载获取到的 `authorizationUrl`
3. 监听 WebView 的 URL 变化或页面加载事件
4. 检测回调 URL：
   - 成功回调：`https://your-backend-domain.com/api/sys/user/oauth2/callback/{provider}?code=xxx&state=xxx`
   - 后端处理后会重定向到：`https://your-frontend-domain.com/oauth2/success?token=xxx`

### 6. 拦截回调 URL

**URL 拦截策略**：

1. **监听 WebView URL 变化**：
   - 当检测到 URL 包含 `/oauth2/success?token=` 时，拦截请求
   - 从 URL 中提取 `token` 参数
   - 关闭 WebView
   - 保存 Token 到本地存储
   - 跳转到 App 首页

2. **监听 WebView 错误**：
   - 当检测到 URL 包含 `/login?error=` 时，拦截请求
   - 从 URL 中提取 `error` 参数
   - 关闭 WebView
   - 显示错误提示给用户
   - 提供重新登录的选项

### 7. 使用深度链接（Deep Link）处理回调（可选）

如果使用深度链接方案：

1. **配置深度链接**：
   - iOS: 配置 URL Scheme 或 Universal Links
   - Android: 配置 Intent Filter 或 App Links

2. **修改回调地址**：
   - 需要在后端配置文件中修改 `app.oauth2.redirect-uri-base` 为深度链接基础地址，如：`yourapp://oauth2/callback`
   - 后端会自动拼接 provider，例如：`yourapp://oauth2/callback/google`
   - 注意：修改后需要重启后端服务

3. **处理深度链接回调**：
   - App 接收到深度链接后，解析参数获取 code 和 state
   - 调用后端接口完成登录（如果后端提供此接口）

### 8. App 端需要做的事情

- ✅ （可选）调用提供商列表接口获取可用的登录提供商
- ✅ 生成随机 state 参数
- ✅ 调用授权接口获取授权 URL
- ✅ 在 WebView 中加载授权 URL
- ✅ 监听 WebView URL 变化，拦截回调 URL
- ✅ 从成功回调 URL 中提取 Token
- ✅ 保存 Token 到本地存储（SharedPreferences / Keychain）
- ✅ 在后续 API 请求中携带 Token
- ✅ 处理错误回调，显示错误信息
- ✅ 提供重新登录的功能

### 9. WebView 配置注意事项

**iOS (WKWebView)**：
- 允许 JavaScript 执行
- 处理 Cookie 和 Session
- 配置 User-Agent（某些 OAuth 提供商可能需要）
- 处理 SSL 证书验证

**Android (WebView)**：
- 启用 JavaScript
- 配置 CookieManager 处理 Cookie
- 处理 SSL 证书验证
- 配置 WebViewClient 拦截 URL

---

## 错误处理

### 常见错误及处理

| 错误信息 | 说明 | 前端处理建议 |
|---------|------|------------|
| `Provider不能为空` | 请求参数缺失 | 检查请求参数是否完整 |
| `未配置 {provider} 的回调地址` | 后端未配置回调地址基础路径 | 联系后端开发人员配置 `app.oauth2.redirect-uri-base` |
| `invalid_state` | State 验证失败 | 可能是请求已过期（超过 5 分钟），提示用户重新登录 |
| `Failed to exchange token` | Token 交换失败 | 可能是网络问题或 OAuth 提供商服务异常，提示用户重试 |
| `OAuth2 授权请求失败` | 授权请求处理异常 | 检查后端日志，提示用户稍后重试 |

### 错误处理流程

1. **授权接口错误**：
   - 检查返回的 `success` 字段
   - 如果为 `false`，显示 `message` 中的错误信息
   - 提供重试机制

2. **回调处理错误**：
   - 从重定向 URL 的 `error` 参数获取错误信息
   - 根据错误类型显示相应的提示
   - 提供重新登录的入口

3. **网络错误**：
   - 处理网络超时、连接失败等情况
   - 提示用户检查网络连接
   - 提供重试按钮

---

## 安全注意事项

### 1. State 参数验证

- State 参数用于防止 CSRF 攻击，必须随机生成且不可预测
- 建议使用加密安全的随机数生成器
- State 有效期 5 分钟，过期后需要重新发起授权

### 2. Token 存储安全

- Token 应该安全存储，避免泄露
- Web 端：使用 HttpOnly Cookie 或加密的 localStorage
- App 端：使用 Keychain（iOS）或 EncryptedSharedPreferences（Android）

### 4. HTTPS 要求

- 所有 OAuth2 相关请求必须使用 HTTPS
- 回调地址必须使用 HTTPS（生产环境）

### 5. 重定向 URI 配置

- `redirectUri` 由后端自动拼接生成，前端不需要传递
- 后端配置路径：`app.oauth2.redirect-uri-base`
- 后端会根据 `redirect-uri-base` 和 `provider` 自动拼接完整回调地址，格式为：`{redirect-uri-base}/{provider}`
- 确保拼接后的回调地址与 OAuth 提供商（Google/Apple）控制台中配置的地址完全匹配
- 生产环境必须使用 HTTPS

---

## 测试建议

### 开发环境测试

1. **本地测试**：
   - 使用 localhost 或内网地址进行测试
   - 确保 OAuth 提供商允许本地回调地址

2. **测试流程**：
   - 测试正常登录流程
   - 测试用户取消授权的情况
   - 测试网络错误情况
   - 测试 State 过期的情况

### 生产环境配置

1. **回调地址配置**：
   - 确保生产环境的回调地址已在 OAuth 提供商（Google/Apple）控制台配置
   - 确保后端配置文件中的 `app.oauth2.redirect-uri-base` 配置正确，后端会自动拼接 provider 生成完整回调地址
   - 确保拼接后的回调地址（格式：`{redirect-uri-base}/{provider}`）与 OAuth 提供商控制台配置的回调地址完全一致
   - 生产环境必须使用 HTTPS

2. **域名配置**：
   - 确保前端成功/失败页面的域名已配置
   - 确保后端重定向地址正确

