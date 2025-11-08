#!/usr/bin/env node

/**
 * 文件上传API测试脚本
 * 
 * 功能：
 * 1. 先账号密码登录（默认账号：1587237547@qq.com，密码：123456789）
 * 2. 上传文件到云存储
 * 
 * 使用方法:
 *   node upload-file-api.js [文件路径] [sysOrgCode]
 * 
 * 示例:
 *   node upload-file-api.js test.jpg A01
 *   node upload-file-api.js ./images/test.png A01
 * 
 * 注意:
 *   - 服务器地址: http://localhost:9080
 *   - 默认账号: 1587237547@qq.com
 *   - 默认密码: 123456789
 *   - 默认 sysOrgCode: A01
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const readline = require('readline');

// 服务器配置
const SERVER_CONFIG = {
    host: 'localhost',
    port: 9080,
    headers: {
        'Accept': 'application/json'
    }
};

// 全局变量
let AUTH_TOKEN = null;
let USER_ID = null;
let TENANT_ID = null;

/**
 * 发送 HTTP 请求（JSON）
 */
function httpRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = { ...SERVER_CONFIG.headers };
        headers['Content-Type'] = 'application/json';
        
        // 添加 token 到请求头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['X-Access-Token'] = token;
        }
        
        const options = {
            host: SERVER_CONFIG.host,
            port: SERVER_CONFIG.port,
            path: path,
            method: method,
            headers: headers
        };
        
        const protocol = options.port === 443 ? https : http;
        
        const req = protocol.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: json
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * 发送文件上传请求（multipart/form-data）
 */
function uploadFileRequest(filePath, sysOrgCode, token) {
    return new Promise((resolve, reject) => {
        // 读取文件
        if (!fs.existsSync(filePath)) {
            reject(new Error(`文件不存在: ${filePath}`));
            return;
        }
        
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        
        // 构建 multipart/form-data 请求体
        let body = '';
        
        // 添加 sysOrgCode 字段
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="sysOrgCode"\r\n\r\n`;
        body += `${sysOrgCode}\r\n`;
        
        // 添加 file 字段
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
        body += `Content-Type: application/octet-stream\r\n\r\n`;
        
        const bodyBuffer = Buffer.concat([
            Buffer.from(body, 'utf8'),
            fileContent,
            Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
        ]);
        
        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': bodyBuffer.length.toString(),
            'Accept': 'application/json'
        };
        
        // 添加 token 到请求头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['X-Access-Token'] = token;
        }
        
        const options = {
            host: SERVER_CONFIG.host,
            port: SERVER_CONFIG.port,
            path: '/api/appApi/uploadFile',
            method: 'POST',
            headers: headers
        };
        
        const protocol = options.port === 443 ? https : http;
        
        const req = protocol.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: json
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(bodyBuffer);
        req.end();
    });
}

/**
 * 交互式输入
 */
function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * 邮箱登录（密码登录）
 */
async function emailLoginWithPassword(email, password) {
    console.log(`\n🔑 正在使用密码登录...`);
    console.log(`邮箱: ${email}`);
    
    const data = {
        email: email,
        loginType: 'password',
        password: password
    };
    
    try {
        const response = await httpRequest('/api/sys/emailLogin', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 密码登录成功！');
            
            if (response.data.result) {
                if (response.data.result.token) {
                    AUTH_TOKEN = response.data.result.token;
                    console.log('✅ Token 已获取');
                }
                
                if (response.data.result.userInfo) {
                    USER_ID = response.data.result.userInfo.id;
                    TENANT_ID = response.data.result.userInfo.relTenantIds || 
                               response.data.result.userInfo.tenantId || 
                               response.data.result.userInfo.sysTenantId || 
                               response.data.result.userInfo.tenantId || 
                               1; // 默认值
                    
                    console.log(`✅ 用户ID: ${USER_ID}`);
                    console.log(`✅ 租户ID: ${TENANT_ID}`);
                }
                
                // 如果从userInfo中没找到tenantId，尝试从result根级别获取
                if (!TENANT_ID || TENANT_ID === 1) {
                    if (response.data.result.sysTenantId) {
                        TENANT_ID = response.data.result.sysTenantId;
                    } else if (response.data.result.tenantId) {
                        TENANT_ID = response.data.result.tenantId;
                    }
                }
            }
            
            return true;
        } else {
            console.error('❌ 密码登录失败！');
            console.error('错误信息:', response.data.message || '未知错误');
            console.error('完整响应:', JSON.stringify(response.data, null, 2));
            return false;
        }
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('错误:', error.message);
        return false;
    }
}

/**
 * 上传文件
 */
async function uploadFile(filePath, sysOrgCode) {
    console.log(`\n📤 正在上传文件...`);
    console.log(`文件路径: ${filePath}`);
    console.log(`部门编号: ${sysOrgCode}`);
    
    if (!AUTH_TOKEN) {
        console.error('❌ Token 未获取，请先登录');
        return false;
    }
    
    try {
        const fileStats = fs.statSync(filePath);
        const fileSize = (fileStats.size / 1024).toFixed(2);
        console.log(`文件大小: ${fileSize} KB`);
        
        const response = await uploadFileRequest(filePath, sysOrgCode, AUTH_TOKEN);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 文件上传成功！');
            
            if (response.data.result && response.data.result.savePath) {
                console.log(`\n📁 文件保存路径: ${response.data.result.savePath}`);
                console.log(`\n💡 提示: 此路径可用于提交反馈时的 picture 字段`);
            } else {
                console.log('返回信息:', response.data.message || '上传成功！');
                console.log('完整响应:', JSON.stringify(response.data, null, 2));
            }
            
            return true;
        } else {
            console.error('❌ 文件上传失败！');
            console.error('状态码:', response.statusCode);
            console.error('错误信息:', response.data.message || '未知错误');
            console.error('完整响应:', JSON.stringify(response.data, null, 2));
            return false;
        }
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('错误:', error.message);
        if (error.stack) {
            console.error('堆栈:', error.stack);
        }
        return false;
    }
}

/**
 * 创建测试文件
 */
function createTestFile() {
    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-upload.txt');
    const testContent = `这是一个测试文件
创建时间: ${new Date().toISOString()}
用于测试文件上传API功能
`;
    
    fs.writeFileSync(testFilePath, testContent, 'utf8');
    console.log(`✅ 已创建测试文件: ${testFilePath}`);
    return testFilePath;
}

/**
 * 主函数
 */
async function main() {
    console.log('='.repeat(60));
    console.log('文件上传API测试脚本');
    console.log('='.repeat(60));
    
    // 默认账号密码
    const defaultEmail = '1587237547@qq.com';
    const defaultPassword = '123456789';
    const defaultSysOrgCode = 'A01';
    
    // 检查是否在非交互模式下（有命令行参数）
    const isNonInteractive = process.argv.length > 2;
    
    // 1. 登录
    console.log('\n📌 步骤 1: 登录');
    console.log('-'.repeat(60));
    
    let email, password;
    
    if (isNonInteractive) {
        // 非交互模式：直接使用默认值
        email = defaultEmail;
        password = defaultPassword;
        console.log(`使用默认账号: ${email}`);
    } else {
        // 交互模式：询问用户
        const emailInput = await question(`请输入邮箱（直接回车使用默认: ${defaultEmail}）: `);
        email = emailInput.trim() || defaultEmail;
        
        const passwordInput = await question(`请输入密码（直接回车使用默认: ${defaultPassword}）: `);
        password = passwordInput.trim() || defaultPassword;
    }
    
    const loginSuccess = await emailLoginWithPassword(email, password);
    
    if (!loginSuccess) {
        console.error('\n❌ 登录失败，脚本终止');
        process.exit(1);
    }
    
    if (!AUTH_TOKEN) {
        console.error('\n❌ Token 未获取，脚本终止');
        process.exit(1);
    }
    
    // 2. 获取文件路径和 sysOrgCode
    console.log('\n📌 步骤 2: 准备上传文件');
    console.log('-'.repeat(60));
    
    // 从命令行参数获取文件路径
    let filePath = process.argv[2];
    let sysOrgCode = process.argv[3] || defaultSysOrgCode;
    
    // 如果没有提供文件路径，询问用户或创建测试文件
    if (!filePath) {
        if (isNonInteractive) {
            // 非交互模式：自动创建测试文件
            filePath = createTestFile();
        } else {
            // 交互模式：询问用户
            const fileInput = await question(`请输入文件路径（直接回车创建测试文件）: `);
            filePath = fileInput.trim();
            
            if (!filePath) {
                // 创建测试文件
                filePath = createTestFile();
            }
        }
    }
    
    // 如果提供了 sysOrgCode，使用提供的；否则使用默认值或询问
    if (!process.argv[3]) {
        if (isNonInteractive) {
            // 非交互模式：使用默认值
            sysOrgCode = defaultSysOrgCode;
        } else {
            // 交互模式：询问用户
            const orgCodeInput = await question(`请输入部门编号（直接回车使用默认: ${defaultSysOrgCode}）: `);
            sysOrgCode = orgCodeInput.trim() || defaultSysOrgCode;
        }
    }
    
    // 3. 上传文件
    console.log('\n📌 步骤 3: 上传文件');
    console.log('-'.repeat(60));
    
    const uploadSuccess = await uploadFile(filePath, sysOrgCode);
    
    if (!uploadSuccess) {
        console.error('\n❌ 文件上传失败');
        process.exit(1);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！');
    console.log('='.repeat(60));
}

// 运行主函数
main().catch(error => {
    console.error('\n❌ 发生错误:', error);
    if (error.stack) {
        console.error('堆栈:', error.stack);
    }
    process.exit(1);
});

