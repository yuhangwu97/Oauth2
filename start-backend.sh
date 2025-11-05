#!/bin/bash

echo "🚀 启动 OAuth2 后端服务..."
echo ""
echo "检查 Redis 是否运行..."

if ! docker ps | grep -q oauth2-redis; then
    echo "⚠️  Redis 未运行，正在启动..."
    docker start oauth2-redis 2>/dev/null || docker run -d --name oauth2-redis -p 6379:6379 aws.registry.trendmicro.com/etscache/library/redis:latest
    sleep 2
fi

echo "✅ Redis 已就绪"
echo ""
echo "启动 Spring Boot 应用..."
echo "后端将在 http://localhost:8080 启动"
echo ""

# 使用 Java 21
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home

cd backend
mvn spring-boot:run
