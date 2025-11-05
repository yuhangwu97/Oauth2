#!/bin/bash

echo "🚀 启动 OAuth2 前端服务..."
echo ""
echo "检查依赖..."

cd frontend

if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo ""
echo "启动 React 应用..."
echo "前端将在 http://localhost:3000 启动"
echo ""

npm start
