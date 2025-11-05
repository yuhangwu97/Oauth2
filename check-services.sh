#!/bin/bash

echo "🔍 检查 OAuth2 系统服务状态..."
echo ""

# 检查 Redis
echo "1️⃣  检查 Redis..."
if docker ps | grep -q oauth2-redis; then
    echo "   ✅ Redis 运行中 (端口 6379)"
else
    echo "   ❌ Redis 未运行"
    echo "   运行: docker start oauth2-redis"
fi
echo ""

# 检查后端
echo "2️⃣  检查后端服务..."
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "   ✅ 后端运行中 (http://localhost:8080)"
else
    echo "   ❌ 后端未运行"
    echo "   运行: ./start-backend.sh"
fi
echo ""

# 检查前端
echo "3️⃣  检查前端服务..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ 前端运行中 (http://localhost:3000)"
else
    echo "   ❌ 前端未运行"
    echo "   运行: ./start-frontend.sh"
fi
echo ""

# 检查端口占用
echo "4️⃣  检查端口占用..."
echo "   端口 6379 (Redis):"
lsof -i :6379 | grep LISTEN || echo "      未占用"
echo "   端口 8080 (后端):"
lsof -i :8080 | grep LISTEN || echo "      未占用"
echo "   端口 3000 (前端):"
lsof -i :3000 | grep LISTEN || echo "      未占用"
echo ""

echo "✨ 检查完成！"
