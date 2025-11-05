# 🚀 快速开始指南

## 当前状态

✅ Redis 已启动并运行在端口 6379

## 下一步操作

### 步骤 1: 配置 OAuth2 凭据

你需要从 Google 和 Facebook 获取 OAuth2 凭据。

#### 获取 Google OAuth2 凭据

1. 访问 https://console.cloud.google.com/
2. 创建项目或选择现有项目
3. 导航到 **API 和服务** → **凭据**
4. 点击 **创建凭据** → **OAuth 客户端 ID**
5. 应用类型选择 **Web 应用**
6. 名称：`OAuth2 Demo`
7. 授权重定向 URI 添加：
   ```
   http://localhost:8080/auth/oauth2/callback/google
   ```
8. 点击创建，复制 **客户端 ID** 和 **客户端密钥**

#### 获取 Facebook OAuth2 凭据

1. 访问 https://developers.facebook.com/
2. 点击 **我的应用** → **创建应用**
3. 选择 **消费者** 类型
4. 填写应用名称，点击创建
5. 在左侧菜单选择 **设置** → **基本**
6. 复制 **应用编号**（App ID）和 **应用密钥**（App Secret）
7. 添加产品 → 选择 **Facebook 登录** → **设置**
8. 在 **有效 OAuth 重定向 URI** 中添加：
   ```
   http://localhost:8080/auth/oauth2/callback/facebook
   ```
9. 保存更改

### 步骤 2: 配置后端

编辑 `backend/src/main/resources/application.yml`，替换以下内容：

```yaml
app:
  oauth2:
    google:
      client-id: 你的_GOOGLE_CLIENT_ID
      client-secret: 你的_GOOGLE_CLIENT_SECRET
    
    facebook:
      client-id: 你的_FACEBOOK_APP_ID
      client-secret: 你的_FACEBOOK_APP_SECRET
```

### 步骤 3: 启动后端

在终端 1 中运行：

```bash
./start-backend.sh
```

等待看到类似以下输出：
```
Started OAuth2Application in X.XXX seconds
```

### 步骤 4: 启动前端

在终端 2 中运行：

```bash
./start-frontend.sh
```

等待看到：
```
webpack compiled successfully
```

### 步骤 5: 测试应用

1. 打开浏览器访问：http://localhost:3000
2. 你会看到登录页面，有 4 个登录按钮
3. 点击 **使用 Google 登录** 或 **使用 Facebook 登录**
4. 完成 OAuth2 授权流程
5. 成功后会跳转到用户信息页面

## 🔍 验证服务

随时运行以下命令检查服务状态：

```bash
./check-services.sh
```

## 📱 测试流程

### Google 登录流程

1. 点击 "使用 Google 登录"
2. 跳转到 Google 授权页面
3. 选择账号并授权
4. 自动跳转回应用
5. 显示用户信息（姓名、邮箱、头像）

### Facebook 登录流程

1. 点击 "使用 Facebook 登录"
2. 跳转到 Facebook 授权页面
3. 登录并授权应用
4. 自动跳转回应用
5. 显示用户信息

## 🐛 故障排除

### 问题 1: 后端启动失败

**错误**: `Failed to configure a DataSource`

**解决**: 确保 H2 数据库依赖已添加到 pom.xml

### 问题 2: Redis 连接失败

**错误**: `Unable to connect to Redis`

**解决**:
```bash
docker ps | grep redis
docker start oauth2-redis
```

### 问题 3: OAuth2 回调错误

**错误**: `redirect_uri_mismatch`

**解决**: 
- 检查 Google/Facebook 控制台中的重定向 URI 配置
- 确保完全匹配：`http://localhost:8080/auth/oauth2/callback/google`

### 问题 4: CORS 错误

**错误**: `Access to fetch blocked by CORS policy`

**解决**: 检查 `SecurityConfig.java` 中的 CORS 配置

## 📊 查看数据

### H2 数据库控制台

访问：http://localhost:8080/h2-console

- JDBC URL: `jdbc:h2:mem:testdb`
- Username: `sa`
- Password: (留空)

查看表：
- `users` - 用户表
- `user_auth` - 用户认证账号表

### Redis 数据

```bash
docker exec -it oauth2-redis redis-cli
> KEYS oauth2:state:*
> GET oauth2:state:xxx
```

## 🎯 下一步

1. ✅ 基础功能已完成
2. 📱 扩展到 App 端（React Native）
3. 🔄 实现 Token 刷新机制
4. 🔗 实现账号绑定功能
5. 📊 添加用户管理界面
6. 🔐 添加更多 OAuth2 提供商（Instagram、Apple）

## 📚 相关文档

- [完整文档](./README.md)
- [配置指南](./SETUP.md)
- [架构设计](./OAuth2-Multi-Platform-Architecture.md)

## 💡 提示

- 开发环境使用 H2 内存数据库，重启后数据会丢失
- JWT Token 默认有效期：Web 7天，移动端 30天
- State 参数在 Redis 中保存 5 分钟后自动过期

祝你使用愉快！🎉
