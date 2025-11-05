# 🏗️ 系统架构说明

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      浏览器客户端                            │
│                   http://localhost:3000                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Login   │  │   Home   │  │ Redirect │  │ Service  │  │
│  │  Page    │  │   Page   │  │ Handler  │  │  Layer   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring Boot 后端                          │
│                   http://localhost:8080                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         UnifiedOAuth2Controller                      │  │
│  │  /auth/oauth2/authorize                             │  │
│  │  /auth/oauth2/callback/{provider}                   │  │
│  │  /auth/oauth2/token                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌─────────────────────────┴────────────────────────────┐  │
│  │                                                       │  │
│  ▼                         ▼                            ▼  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Google     │  │   Facebook   │  │  Instagram   │    │
│  │   Service    │  │   Service    │  │   Service    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │     User     │  │    Token     │  │   Security   │    │
│  │   Service    │  │   Provider   │  │    Config    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  H2 Database │    │    Redis     │    │   OAuth2     │
│  (内存数据库)  │    │  (State存储)  │    │  Providers   │
│              │    │              │    │              │
│  - users     │    │ oauth2:state │    │  - Google    │
│  - user_auth │    │              │    │  - Facebook  │
└──────────────┘    └──────────────┘    └──────────────┘
```

## 技术栈

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 3.2.0 | 应用框架 |
| Spring Security | 6.x | 安全框架 |
| Spring Data JPA | 3.x | 数据访问 |
| Spring Data Redis | 3.x | Redis 集成 |
| H2 Database | 2.x | 内存数据库（开发） |
| JWT (jjwt) | 0.11.5 | Token 生成 |
| Lombok | 1.18.x | 代码简化 |
| Maven | 3.6+ | 构建工具 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| React Router | 6.20.0 | 路由管理 |
| CSS3 | - | 样式 |

### 基础设施

| 服务 | 版本 | 用途 |
|------|------|------|
| Redis | latest | State 存储 |
| Docker | - | 容器化 |

## 核心模块

### 1. Controller 层

**UnifiedOAuth2Controller**
- 统一的 OAuth2 认证入口
- 处理所有平台的认证请求
- 管理回调和 Token 交换

### 2. Service 层

**OAuth2Service 接口**
- 定义 OAuth2 服务标准
- 支持多提供商扩展

**GoogleOAuth2Service**
- Google OAuth2 实现
- 处理 Google 特定逻辑

**FacebookOAuth2Service**
- Facebook OAuth2 实现
- 处理 Facebook 特定逻辑

**UserService**
- 用户管理
- 多账号绑定

**OAuth2ServiceFactory**
- 服务工厂模式
- 动态获取对应的 OAuth2 服务

### 3. Security 层

**TokenProvider**
- JWT Token 生成
- Token 验证
- 平台特定的过期时间

**SecurityConfig**
- Spring Security 配置
- CORS 配置
- 端点权限控制

### 4. Model 层

**User**
- 用户主表
- 存储基本信息

**UserAuth**
- 用户认证账号表
- 支持多账号绑定
- 记录登录历史

### 5. DTO 层

**OAuth2AuthRequest**
- 授权请求参数

**OAuth2TokenRequest**
- Token 交换请求

**OAuth2State**
- State 状态数据

**OAuth2UserInfo**
- OAuth2 用户信息

## 数据流

### Web 端登录流程

```
1. 用户点击登录按钮
   ↓
2. 前端调用 /auth/oauth2/authorize
   - provider: GOOGLE
   - platform: WEB
   - redirectUri: http://localhost:3000/oauth2/redirect
   - state: random_string
   ↓
3. 后端生成授权 URL
   - 保存 state 到 Redis (5分钟)
   - 返回授权 URL
   ↓
4. 前端跳转到 Google 授权页面
   ↓
5. 用户在 Google 授权
   ↓
6. Google 回调后端
   GET /auth/oauth2/callback/google?code=xxx&state=xxx
   ↓
7. 后端处理回调
   - 验证 state
   - 用 code 换 access_token
   - 获取用户信息
   - 创建/更新用户
   - 生成 JWT
   ↓
8. 后端重定向到前端
   http://localhost:3000/oauth2/redirect?token=jwt_token
   ↓
9. 前端保存 token 到 localStorage
   ↓
10. 跳转到首页，登录完成
```

## 安全机制

### 1. State 参数
- 防止 CSRF 攻击
- Redis 存储，5分钟自动过期
- 每次请求生成唯一值

### 2. JWT Token
- 无状态认证
- 包含用户 ID、平台、邮箱等信息
- 不同平台不同过期时间

### 3. CORS 配置
- 限制允许的源
- 控制允许的方法和头

### 4. Redirect URI 白名单
- 防止重定向攻击
- 只允许配置的 URI

### 5. client_secret 保护
- 仅在后端存储
- 前端永不接触

## 扩展性

### 添加新的 OAuth2 提供商

1. 创建新的 Service 实现 `OAuth2Service` 接口
2. 在 `AuthProvider` 枚举中添加新提供商
3. 在 `application.yml` 中添加配置
4. 前端添加登录按钮

### 添加新的客户端平台

1. 在 `ClientPlatform` 枚举中添加新平台
2. 前端实现对应的认证流程
3. 如需 PKCE，在 Controller 中添加验证逻辑

### 数据库切换

开发环境使用 H2，生产环境切换到 MySQL：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/oauth2_db
    username: root
    password: your-password
  jpa:
    hibernate:
      ddl-auto: update
```

## 性能优化

1. **Redis 缓存**
   - State 数据自动过期
   - 可扩展用户信息缓存

2. **数据库索引**
   - provider + provider_user_id 唯一索引
   - email 索引

3. **连接池**
   - HikariCP 默认配置
   - Redis 连接池

## 监控和日志

### 日志级别

```yaml
logging:
  level:
    com.example.oauth2: DEBUG
    org.springframework.security: DEBUG
```

### 健康检查

```bash
curl http://localhost:8080/actuator/health
```

## 部署建议

### 开发环境
- H2 内存数据库
- 本地 Redis
- HTTP

### 生产环境
- MySQL/PostgreSQL
- Redis 集群
- HTTPS
- 负载均衡
- 日志收集
- 监控告警
