# OAuth2 多平台认证系统

基于文档 `OAuth2-Multi-Platform-Architecture.md` 实现的完整 OAuth2 多平台认证系统。

## 项目结构

```
├── backend/                    # Java Spring Boot 后端
│   ├── src/main/java/
│   │   └── com/example/oauth2/
│   │       ├── OAuth2Application.java
│   │       ├── config/         # 配置类
│   │       ├── controller/     # 控制器
│   │       ├── dto/            # 数据传输对象
│   │       ├── model/          # 实体类
│   │       ├── repository/     # 数据访问层
│   │       ├── security/       # 安全相关
│   │       └── service/        # 业务逻辑
│   ├── src/main/resources/
│   │   └── application.yml     # 配置文件
│   └── pom.xml
│
└── frontend/                   # React Web 前端
    ├── public/
    ├── src/
    │   ├── pages/              # 页面组件
    │   ├── services/           # 服务类
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## 功能特性

- ✅ 支持多个 OAuth2 提供商（Google、Facebook、Instagram、Apple）
- ✅ 支持多个客户端平台（Web、iOS、Android、小程序）
- ✅ 统一的认证 API
- ✅ JWT Token 认证
- ✅ Redis 存储 state（防 CSRF）
- ✅ PKCE 支持（App 端）
- ✅ 用户多账号绑定

## 快速开始

### 后端启动

1. 安装 Redis（如果使用 Docker）：
```bash
docker run -d -p 6379:6379 redis
```

2. 配置 OAuth2 客户端 ID 和密钥：
编辑 `backend/src/main/resources/application.yml`，设置环境变量或直接替换：
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- FACEBOOK_CLIENT_ID
- FACEBOOK_CLIENT_SECRET

3. 启动后端：
```bash
cd backend
mvn spring-boot:run
```

后端将在 http://localhost:8080 启动

### 前端启动

1. 安装依赖：
```bash
cd frontend
npm install
```

2. 启动前端：
```bash
npm start
```

前端将在 http://localhost:3000 启动

## 使用说明

1. 访问 http://localhost:3000
2. 点击任意 OAuth2 提供商按钮（如 Google）
3. 在弹出的授权页面完成登录
4. 自动跳转回应用并显示用户信息

## API 端点

### 统一认证入口
```
POST /auth/oauth2/authorize
```

### OAuth2 回调（Web 端）
```
GET /auth/oauth2/callback/{provider}
```

### Token 交换（App/小程序）
```
POST /auth/oauth2/token
```

## 配置 OAuth2 提供商

### Google OAuth2

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目并启用 Google+ API
3. 创建 OAuth 2.0 客户端 ID
4. 添加授权重定向 URI：`http://localhost:8080/auth/oauth2/callback/google`

### Facebook OAuth2

1. 访问 [Facebook Developers](https://developers.facebook.com/)
2. 创建应用
3. 添加 Facebook Login 产品
4. 配置有效 OAuth 重定向 URI：`http://localhost:8080/auth/oauth2/callback/facebook`

## 技术栈

### 后端
- Spring Boot 3.2.0
- Spring Security
- Spring Data JPA
- Redis
- JWT (jjwt 0.11.5)
- H2 Database（开发环境）
- MySQL（生产环境）

### 前端
- React 18
- React Router 6
- CSS3

## 安全特性

- ✅ client_secret 仅在后端存储
- ✅ State 参数防 CSRF 攻击
- ✅ PKCE 支持（App 端）
- ✅ JWT Token 认证
- ✅ Redirect URI 白名单
- ✅ HTTPS 支持（生产环境）

## 开发说明

这是一个演示项目，生产环境使用前请注意：

1. 修改 JWT secret 为强密钥
2. 配置生产环境数据库（MySQL）
3. 启用 HTTPS
4. 配置正确的 CORS 策略
5. 添加日志和监控
6. 实现 Token 刷新机制

## 许可证

MIT
