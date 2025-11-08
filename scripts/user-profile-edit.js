#!/usr/bin/env node

/**
 * 用户信息修改API测试脚本
 * 
 * 功能：
 * 1. 先账号密码登录（默认账号：1587237547@qq.com，密码：123456789）
 * 2. 获取当前用户信息
 * 3. 修改用户姓名
 * 4. 修改头像URL（直接提供URL，不上传文件）
 * 5. 同时修改姓名和头像URL
 * 6. 查询用户列表
 * 
 * 使用方法:
 *   node user-profile-update-api.js
 * 
 * 注意:
 *   - 服务器地址: http://localhost:9080
 *   - 默认账号: 1587237547@qq.com
 *   - 默认密码: 123456789
 *   - 头像修改需要提供完整的URL，不上传文件
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
let USER_INFO = null;

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
                    USER_INFO = response.data.result.userInfo;
                    USER_ID = response.data.result.userInfo.id;
                    console.log(`✅ 用户ID: ${USER_ID}`);
                    console.log(`✅ 用户名: ${USER_INFO.username || '(无)'}`);
                    console.log(`✅ 真实姓名: ${USER_INFO.realname || '(无)'}`);
                    console.log(`✅ 头像: ${USER_INFO.avatar || '(无)'}`);
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
 * 获取当前用户信息
 */
async function getCurrentUserInfo() {
    console.log(`\n📋 正在获取当前用户信息...`);
    
    if (!AUTH_TOKEN) {
        console.error('❌ 未登录，请先登录');
        return false;
    }
    
    try {
        const response = await httpRequest('/api/sys/user/getUserInfo', 'GET', null, AUTH_TOKEN);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 获取用户信息成功！');
            
            const userInfo = response.data.result?.userInfo;
            if (userInfo) {
                console.log(`\n📊 用户信息:`);
                console.log(`  用户ID: ${userInfo.id || '(无)'}`);
                console.log(`  用户名: ${userInfo.username || '(无)'}`);
                console.log(`  真实姓名: ${userInfo.realname || '(无)'}`);
                console.log(`  头像: ${userInfo.avatar || '(无)'}`);
                console.log(`  邮箱: ${userInfo.email || '(无)'}`);
                console.log(`  手机号: ${userInfo.phone || '(无)'}`);
                console.log(`  性别: ${userInfo.sex || '(无)'}`);
                console.log(`  生日: ${userInfo.birthday || '(无)'}`);
                console.log(`  状态: ${userInfo.status || '(无)'}`);
                
                // 更新全局用户信息
                USER_INFO = userInfo;
                USER_ID = userInfo.id;
            }
            
            return true;
        } else {
            console.error('❌ 获取用户信息失败！');
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
 * 修改用户姓名和头像
 */
async function updateUserProfile(realname, avatar) {
    console.log(`\n📝 正在修改用户信息...`);
    
    if (!AUTH_TOKEN) {
        console.error('❌ 未登录，请先登录');
        return false;
    }
    
    if (!realname && !avatar) {
        console.error('❌ 至少需要提供一个参数（realname 或 avatar）');
        return false;
    }
    
    const data = {};
    if (realname) {
        data.realname = realname;
        console.log(`  真实姓名: ${realname}`);
    }
    if (avatar) {
        data.avatar = avatar;
        console.log(`  头像URL: ${avatar}`);
    }
    
    try {
        const response = await httpRequest('/api/sys/user/appUpdateProfile', 'PUT', data, AUTH_TOKEN);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 修改成功！');
            console.log('返回信息:', response.data.message || '修改成功!');
            
            if (response.data.result) {
                const result = response.data.result;
                console.log(`\n📊 更新后的用户信息:`);
                console.log(`  用户ID: ${result.id || '(无)'}`);
                console.log(`  用户名: ${result.username || '(无)'}`);
                console.log(`  真实姓名: ${result.realname || '(无)'}`);
                console.log(`  头像: ${result.avatar || '(无)'}`);
                console.log(`  邮箱: ${result.email || '(无)'}`);
                console.log(`  更新时间: ${result.updateTime || '(无)'}`);
            }
            
            return true;
        } else {
            console.error('❌ 修改失败！');
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
 * 查询用户列表
 */
async function queryUserList(keyword, username, pageNo = 1, pageSize = 10) {
    console.log(`\n🔍 正在查询用户列表...`);
    
    if (!AUTH_TOKEN) {
        console.error('❌ 未登录，请先登录');
        return false;
    }
    
    const queryParams = new URLSearchParams();
    if (keyword) {
        queryParams.append('keyword', keyword);
        console.log(`  关键词: ${keyword}`);
    }
    if (username) {
        queryParams.append('username', username);
        console.log(`  用户名: ${username}`);
    }
    queryParams.append('pageNo', pageNo.toString());
    queryParams.append('pageSize', pageSize.toString());
    console.log(`  页码: ${pageNo}, 每页数量: ${pageSize}`);
    
    const path = `/api/sys/user/appQueryUser?${queryParams.toString()}`;
    
    try {
        const response = await httpRequest(path, 'GET', null, AUTH_TOKEN);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 查询成功！');
            
            const result = response.data.result || [];
            console.log(`\n📊 查询结果 (共 ${result.length} 条):`);
            
            if (result.length === 0) {
                console.log('  暂无用户记录');
            } else {
                result.forEach((user, index) => {
                    console.log(`\n  [${index + 1}] 用户ID: ${user.id}`);
                    console.log(`      用户名: ${user.username || '(无)'}`);
                    console.log(`      真实姓名: ${user.realname || '(无)'}`);
                    console.log(`      头像: ${user.avatar || '(无)'}`);
                    console.log(`      邮箱: ${user.email || '(无)'}`);
                    console.log(`      手机号: ${user.phone || '(无)'}`);
                });
            }
            
            return true;
        } else {
            console.error('❌ 查询失败！');
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
    console.log('用户信息修改API测试脚本');
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
    
    if (!AUTH_TOKEN) {
        console.error('\n❌ 未获取到token，脚本终止');
        process.exit(1);
    }
    
    // 等待一下
    console.log('\n⏳ 等待2秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. 获取当前用户信息
    console.log('\n📌 步骤 2: 获取当前用户信息');
    console.log('-'.repeat(60));
    
    const getInfoSuccess = await getCurrentUserInfo();
    
    if (!getInfoSuccess) {
        console.error('\n❌ 获取用户信息失败');
    }
    
    // 等待一下
    console.log('\n⏳ 等待2秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 修改用户姓名
    console.log('\n📌 步骤 3: 修改用户姓名');
    console.log('-'.repeat(60));
    
    const realnameInput = await question('请输入新的真实姓名（直接回车跳过）: ');
    const newRealname = realnameInput.trim() || null;
    
    if (newRealname) {
        const updateRealnameSuccess = await updateUserProfile(newRealname, null);
        
        if (!updateRealnameSuccess) {
            console.error('\n❌ 修改姓名失败');
        }
    } else {
        console.log('已跳过修改姓名');
    }
    
    // 等待一下
    console.log('\n⏳ 等待2秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. 修改头像URL
    console.log('\n📌 步骤 4: 修改头像URL');
    console.log('-'.repeat(60));
    console.log('提示: 头像URL需要是完整的URL地址，例如: https://example.com/avatar.jpg');
    
    const avatarInput = await question('请输入头像URL（直接回车跳过）: ');
    const newAvatar = avatarInput.trim() || null;
    
    if (newAvatar) {
        const updateAvatarSuccess = await updateUserProfile(null, newAvatar);
        
        if (!updateAvatarSuccess) {
            console.error('\n❌ 修改头像失败');
        }
    } else {
        console.log('已跳过修改头像');
    }
    
    // 等待一下
    console.log('\n⏳ 等待2秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. 同时修改姓名和头像
    console.log('\n📌 步骤 5: 同时修改姓名和头像（可选）');
    console.log('-'.repeat(60));
    
    const updateBoth = await question('是否要同时修改姓名和头像？(yes/no，默认no): ');
    
    if (updateBoth.trim().toLowerCase() === 'yes') {
        const bothRealname = await question('请输入真实姓名（直接回车使用当前值）: ');
        const bothAvatar = await question('请输入头像URL（直接回车使用当前值）: ');
        
        const finalRealname = bothRealname.trim() || USER_INFO?.realname || null;
        const finalAvatar = bothAvatar.trim() || USER_INFO?.avatar || null;
        
        if (finalRealname || finalAvatar) {
            const updateBothSuccess = await updateUserProfile(finalRealname, finalAvatar);
            
            if (!updateBothSuccess) {
                console.error('\n❌ 同时修改失败');
            }
        } else {
            console.log('未提供任何修改内容');
        }
    } else {
        console.log('已跳过同时修改');
    }
    
    // 等待一下
    console.log('\n⏳ 等待2秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. 查询用户列表
    console.log('\n📌 步骤 6: 查询用户列表');
    console.log('-'.repeat(60));
    
    const searchType = await question('查询方式: 1-关键词搜索, 2-用户名精确查询, 3-查询所有（直接回车使用关键词搜索）: ');
    const searchTypeValue = searchType.trim() || '1';
    
    let keyword = null;
    let username = null;
    
    if (searchTypeValue === '1') {
        keyword = await question('请输入搜索关键词（直接回车查询所有）: ');
        keyword = keyword.trim() || null;
    } else if (searchTypeValue === '2') {
        username = await question('请输入用户名（支持多个，逗号分隔）: ');
        username = username.trim() || null;
    }
    
    const pageNoInput = await question('请输入页码（直接回车使用1）: ');
    const pageNo = parseInt(pageNoInput.trim()) || 1;
    
    const pageSizeInput = await question('请输入每页数量（直接回车使用10）: ');
    const pageSize = parseInt(pageSizeInput.trim()) || 10;
    
    const querySuccess = await queryUserList(keyword, username, pageNo, pageSize);
    
    if (!querySuccess) {
        console.error('\n❌ 查询用户列表失败');
    }
    
    // 7. 再次获取用户信息验证
    console.log('\n📌 步骤 7: 验证修改结果');
    console.log('-'.repeat(60));
    
    const verifySuccess = await getCurrentUserInfo();
    
    if (!verifySuccess) {
        console.error('\n❌ 验证失败');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！');
    console.log('='.repeat(60));
    console.log(`邮箱: ${email}`);
    if (AUTH_TOKEN) {
        console.log(`Token: ${AUTH_TOKEN.substring(0, 20)}...`);
    }
    console.log('='.repeat(60));
}

// 运行主函数
main().catch(error => {
    console.error('\n❌ 发生错误:', error);
    process.exit(1);
});
