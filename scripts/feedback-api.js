#!/usr/bin/env node

/**
 * 反馈功能API测试脚本
 * 
 * 功能：
 * 1. 先账号密码登录（默认账号：1587237547@qq.com，密码：123456789）
 * 2. 添加反馈（不需要图片）
 * 3. 查询反馈列表
 * 
 * 使用方法:
 *   node feedback-api.js
 * 
 * 注意:
 *   - 服务器地址: http://localhost:9080
 *   - 默认账号: 1587237547@qq.com
 *   - 默认密码: 123456789
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const readline = require('readline');

// 服务器配置
const SERVER_CONFIG = {
    host: 'localhost',
    port: 9080,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// 全局变量
let AUTH_TOKEN = null;
let USER_ID = null;
let TENANT_ID = null;

/**
 * 发送 HTTP 请求
 */
function httpRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = { ...SERVER_CONFIG.headers };
        
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
                               response.data.result.sysTenantId || 
                               response.data.result.tenantId || 
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
 * 添加反馈
 */
async function addFeedback(content) {
    console.log(`\n📝 正在添加反馈...`);
    console.log(`反馈内容: ${content}`);
    
    if (!USER_ID || !TENANT_ID) {
        console.error('❌ 用户ID或租户ID未获取，请先登录');
        return false;
    }
    
    const data = {
        content: content,
        createBy: USER_ID,
        tenantId: TENANT_ID
        // 不传picture字段，表示无图片
    };
    
    try {
        const response = await httpRequest('/api/appApi/addFeedback', 'POST', data, AUTH_TOKEN);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 反馈添加成功！');
            console.log('返回信息:', response.data.message || '添加成功！');
            return true;
        } else {
            console.error('❌ 反馈添加失败！');
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
 * 查询反馈列表
 */
async function getFeedbackList(pageNo = 1, pageSize = 20) {
    console.log(`\n📋 正在查询反馈列表...`);
    console.log(`页码: ${pageNo}, 每页数量: ${pageSize}`);
    
    if (!USER_ID || !TENANT_ID) {
        console.error('❌ 用户ID或租户ID未获取，请先登录');
        return false;
    }
    
    const queryParams = new URLSearchParams({
        createBy: USER_ID,
        tenantId: TENANT_ID.toString(),
        pageNo: pageNo.toString(),
        pageSize: pageSize.toString()
    });
    
    const path = `/api/appApi/feedbackList?${queryParams.toString()}`;
    
    try {
        const response = await httpRequest(path, 'GET', null, AUTH_TOKEN);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 反馈列表查询成功！');
            
            const result = response.data.result;
            if (result) {
                console.log(`\n📊 查询结果:`);
                console.log(`  总记录数: ${result.total || 0}`);
                console.log(`  当前页码: ${result.current || pageNo}`);
                console.log(`  每页数量: ${result.size || pageSize}`);
                console.log(`  总页数: ${result.pages || 0}`);
                
                const records = result.records || [];
                console.log(`\n📝 反馈记录 (共 ${records.length} 条):`);
                
                if (records.length === 0) {
                    console.log('  暂无反馈记录');
                } else {
                    records.forEach((record, index) => {
                        console.log(`\n  [${index + 1}] 反馈ID: ${record.id}`);
                        console.log(`      内容: ${record.content || '(无)'}`);
                        console.log(`      图片: ${record.picture || '(无图片)'}`);
                        console.log(`      创建时间: ${record.createTime || '(无)'}`);
                        console.log(`      创建人: ${record.createBy || '(无)'}`);
                    });
                }
            }
            
            return true;
        } else {
            console.error('❌ 反馈列表查询失败！');
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
 * 主函数
 */
async function main() {
    console.log('='.repeat(60));
    console.log('反馈功能API测试脚本');
    console.log('='.repeat(60));
    
    // 默认账号密码
    const defaultEmail = '1587237547@qq.com';
    const defaultPassword = '123456789';
    
    // 1. 登录
    console.log('\n📌 步骤 1: 登录');
    console.log('-'.repeat(60));
    
    const emailInput = await question(`请输入邮箱（直接回车使用默认: ${defaultEmail}）: `);
    const email = emailInput.trim() || defaultEmail;
    
    const passwordInput = await question(`请输入密码（直接回车使用默认: ${defaultPassword}）: `);
    const password = passwordInput.trim() || defaultPassword;
    
    const loginSuccess = await emailLoginWithPassword(email, password);
    
    if (!loginSuccess) {
        console.error('\n❌ 登录失败，脚本终止');
        process.exit(1);
    }
    
    if (!AUTH_TOKEN || !USER_ID || !TENANT_ID) {
        console.error('\n❌ 登录信息不完整，脚本终止');
        console.error(`Token: ${AUTH_TOKEN ? '已获取' : '未获取'}`);
        console.error(`用户ID: ${USER_ID || '未获取'}`);
        console.error(`租户ID: ${TENANT_ID || '未获取'}`);
        process.exit(1);
    }
    
    // 2. 添加反馈
    console.log('\n📌 步骤 2: 添加反馈');
    console.log('-'.repeat(60));
    
    const feedbackContent = await question('请输入反馈内容（直接回车使用默认内容）: ');
    const content = feedbackContent.trim() || '这是一条测试反馈，用于验证反馈功能是否正常工作。';
    
    const addSuccess = await addFeedback(content);
    
    if (!addSuccess) {
        console.error('\n❌ 添加反馈失败');
    }
    
    // 等待一下，确保数据已保存
    console.log('\n⏳ 等待2秒后查询反馈列表...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 查询反馈列表
    console.log('\n📌 步骤 3: 查询反馈列表');
    console.log('-'.repeat(60));
    
    const listSuccess = await getFeedbackList(1, 20);
    
    if (!listSuccess) {
        console.error('\n❌ 查询反馈列表失败');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！');
    console.log('='.repeat(60));
}

// 运行主函数
main().catch(error => {
    console.error('\n❌ 发生错误:', error);
    process.exit(1);
});

