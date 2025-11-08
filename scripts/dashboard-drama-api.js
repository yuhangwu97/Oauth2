#!/usr/bin/env node

/**
 * 推荐剧目列表API测试脚本
 * 
 * 功能：
 * 1. 先登录获取 token
 * 2. 测试轮播列表接口 (carouselList)
 * 3. 测试推荐剧目列表接口 (winnowList)
 * 4. 测试热门剧目列表接口 (hotDramaList)
 * 5. 测试分类列表接口 (filmDlassifyList)
 * 6. 测试分类剧集列表接口 (filmDramaList)
 * 
 * 使用方法:
 *   node test-drama-api.js
 * 
 * 注意:
 *   - 服务器地址: http://localhost:9080
 *   - 需要先执行 test-data.sql 插入测试数据
 *   - 所有接口都需要 token 认证
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

// 全局 token
let AUTH_TOKEN = null;

/**
 * 发送 HTTP 请求（支持 GET 和 POST）
 */
function httpRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = { ...SERVER_CONFIG.headers };
        
        // 添加 token 到请求头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
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
 * 发送 HTTP GET 请求（带 token）
 */
function httpGet(path, token = null) {
    return httpRequest(path, 'GET', null, token || AUTH_TOKEN);
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
 * 构建查询参数字符串
 */
function buildQueryString(params) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            queryParams.append(key, params[key]);
        }
    });
    const queryString = queryParams.toString();
    return queryString ? '?' + queryString : '';
}

/**
 * 发送邮箱验证码
 */
async function sendEmailCode(email, emailmode) {
    const data = {
        email: email,
        emailmode: emailmode
    };
    
    try {
        const response = await httpRequest('/api/sys/sendEmailCode', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            return { success: true };
        } else {
            const errorMessage = response.data.message || '未知错误';
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 邮箱登录（验证码登录）
 */
async function emailLoginWithCode(email, captcha) {
    const data = {
        email: email,
        loginType: 'code',
        captcha: captcha
    };
    
    try {
        const response = await httpRequest('/api/sys/emailLogin', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            if (response.data.result && response.data.result.token) {
                return { success: true, token: response.data.result.token };
            }
            return { success: false, message: '登录成功但未返回 token' };
        } else {
            const errorMessage = response.data.message || '未知错误';
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 邮箱登录（密码登录）
 */
async function emailLoginWithPassword(email, password) {
    const data = {
        email: email,
        loginType: 'password',
        password: password
    };
    
    try {
        const response = await httpRequest('/api/sys/emailLogin', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            if (response.data.result && response.data.result.token) {
                return { success: true, token: response.data.result.token };
            }
            return { success: false, message: '登录成功但未返回 token' };
        } else {
            const errorMessage = response.data.message || '未知错误';
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 登录并获取 token
 */
async function login() {
    console.log('\n🔐 登录获取 Token');
    console.log('='.repeat(60));
    
    // 获取邮箱
    const email = await question('请输入邮箱（直接回车使用默认: 1587237547@qq.com）: ');
    const finalEmail = email.trim() || '1587237547@qq.com';
    
    // 选择登录方式
    console.log('\n请选择登录方式:');
    console.log('1. 验证码登录（推荐）');
    console.log('2. 密码登录');
    const loginType = await question('请输入选项 (1/2，默认1): ');
    const selectedType = loginType.trim() || '1';
    
    if (selectedType === '1') {
        // 验证码登录
        console.log(`\n📧 正在发送验证码到: ${finalEmail}...`);
        const sendCodeResult = await sendEmailCode(finalEmail, '0');
        
        if (!sendCodeResult.success) {
            console.error('❌ 验证码发送失败！');
            console.error('错误信息:', sendCodeResult.message);
            if (sendCodeResult.message && sendCodeResult.message.includes('ECONNREFUSED')) {
                console.error('提示: 请确保后端服务已启动，并且运行在 http://localhost:9080');
            }
            return null;
        }
        
        console.log('✅ 验证码发送成功！请查收邮件');
        const captcha = await question('\n请输入验证码（6位数字）: ');
        
        if (!captcha || captcha.trim().length === 0) {
            console.error('❌ 验证码不能为空');
            return null;
        }
        
        console.log('\n🔑 正在登录...');
        const loginResult = await emailLoginWithCode(finalEmail, captcha.trim());
        
        if (loginResult.success) {
            console.log('✅ 登录成功！');
            return loginResult.token;
        } else {
            console.error('❌ 登录失败！');
            console.error('错误信息:', loginResult.message);
            return null;
        }
    } else {
        // 密码登录
        const password = await question('\n请输入密码: ');
        
        if (!password || password.trim().length === 0) {
            console.error('❌ 密码不能为空');
            return null;
        }
        
        console.log('\n🔑 正在登录...');
        const loginResult = await emailLoginWithPassword(finalEmail, password.trim());
        
        if (loginResult.success) {
            console.log('✅ 登录成功！');
            return loginResult.token;
        } else {
            console.error('❌ 登录失败！');
            console.error('错误信息:', loginResult.message);
            return null;
        }
    }
}

/**
 * 测试轮播列表接口
 */
async function testCarouselList(token) {
    console.log('\n📺 测试轮播列表接口 (carouselList)');
    console.log('='.repeat(60));
    
    try {
        // 测试1: 基础调用（默认返回10条）
        console.log('\n【测试1】基础调用（默认返回10条）');
        let path = '/api/appApi/carouselList' + buildQueryString({ sysOrgCode: 'A01' });
        let response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：10条精选剧目（dramaSign='2'）`);
            if (list.length > 0) {
                console.log(`   示例剧目：${list[0].dramaName}`);
                console.log(`   排序字段：${list[0].sort}`);
            }
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试2: 指定limit参数
        console.log('\n【测试2】指定limit=5（返回5条）');
        path = '/api/appApi/carouselList' + buildQueryString({ sysOrgCode: 'A01', limit: 5 });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：5条精选剧目`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试3: 按频道筛选
        console.log('\n【测试3】按频道筛选（男生频道）');
        path = '/api/appApi/carouselList' + buildQueryString({ sysOrgCode: 'A01', dramaChannel: '1' });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：男生频道（dramaChannel='1'）的精选剧目`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('   错误:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   提示: 请确保后端服务已启动，并且运行在 http://localhost:9080');
        }
    }
}

/**
 * 测试推荐剧目列表接口
 */
async function testWinnowList(token) {
    console.log('\n🎬 测试推荐剧目列表接口 (winnowList)');
    console.log('='.repeat(60));
    
    try {
        // 测试1: 基础调用
        console.log('\n【测试1】基础调用（获取所有精选剧目）');
        let path = '/api/appApi/winnowList' + buildQueryString({ sysOrgCode: 'A01' });
        let response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：所有精选剧目（dramaSign='2'）`);
            if (list.length > 0) {
                console.log(`   示例剧目：${list[0].dramaName}`);
                console.log(`   总播放量：${list[0].totalPlay || 'N/A'}`);
            }
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试2: 按分类筛选
        console.log('\n【测试2】按分类筛选（武侠分类）');
        path = '/api/appApi/winnowList' + buildQueryString({ 
            sysOrgCode: 'A01', 
            dramaClassify: 'test_classify_001' 
        });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：武侠分类的精选剧目`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试3: 搜索功能
        console.log('\n【测试3】搜索功能（搜索"总裁"）');
        path = '/api/appApi/winnowList' + buildQueryString({ 
            sysOrgCode: 'A01', 
            searchValue: '总裁' 
        });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：包含"总裁"关键词的精选剧目`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('   错误:', error.message);
    }
}

/**
 * 测试热门剧目列表接口
 */
async function testHotDramaList(token) {
    console.log('\n🔥 测试热门剧目列表接口 (hotDramaList)');
    console.log('='.repeat(60));
    
    try {
        const path = '/api/appApi/hotDramaList' + buildQueryString({ sysOrgCode: 'A01' });
        const response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：所有热门剧目（dramaSign='1'）`);
            if (list.length > 0) {
                console.log(`   示例剧目：${list[0].dramaName}`);
            }
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('   错误:', error.message);
    }
}

/**
 * 测试分类列表接口
 */
async function testFilmDlassifyList(token) {
    console.log('\n📂 测试分类列表接口 (filmDlassifyList)');
    console.log('='.repeat(60));
    
    try {
        // 测试1: 基础调用
        console.log('\n【测试1】基础调用（获取所有分类）');
        let path = '/api/wxApi/filmDlassifyList' + buildQueryString({ sysOrgCode: 'A01' });
        let response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：所有启用状态的分类（classifyStatus='1'）`);
            if (list.length > 0) {
                console.log(`   分类列表：`);
                list.forEach((item, index) => {
                    console.log(`     ${index + 1}. ${item.classifyName} (ID: ${item.id}, 排序: ${item.sort})`);
                });
            }
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试2: 搜索分类
        console.log('\n【测试2】搜索分类（搜索"武侠"）');
        path = '/api/wxApi/filmDlassifyList' + buildQueryString({ 
            sysOrgCode: 'A01',
            classifyName: '武侠'
        });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const list = response.data.result || [];
            console.log(`✅ 成功！返回 ${list.length} 条数据`);
            console.log(`   预期：包含"武侠"的分类`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('   错误:', error.message);
    }
}

/**
 * 测试分类剧集列表接口
 */
async function testFilmDramaList(token) {
    console.log('\n📋 测试分类剧集列表接口 (filmDramaList)');
    console.log('='.repeat(60));
    
    try {
        // 测试1: 基础调用（全部，第一页）
        console.log('\n【测试1】基础调用（全部，第一页，每页10条）');
        let path = '/api/appApi/filmDramaList' + buildQueryString({
            pageNo: 1,
            pageSize: 10,
            sysOrgCode: 'A01'
        });
        let response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const result = response.data.result || {};
            const records = result.records || [];
            console.log(`✅ 成功！`);
            console.log(`   当前页：${result.current || 'N/A'}`);
            console.log(`   每页数量：${result.size || 'N/A'}`);
            console.log(`   总记录数：${result.total || 'N/A'}`);
            console.log(`   总页数：${result.pages || 'N/A'}`);
            console.log(`   本页数据：${records.length} 条`);
            if (records.length > 0) {
                console.log(`   示例剧目：${records[0].dramaName}`);
            }
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试2: 按分类筛选
        console.log('\n【测试2】按分类筛选（武侠分类）');
        path = '/api/appApi/filmDramaList' + buildQueryString({
            pageNo: 1,
            pageSize: 10,
            sysOrgCode: 'A01',
            dramaClassify: 'test_classify_001'
        });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const result = response.data.result || {};
            const records = result.records || [];
            console.log(`✅ 成功！`);
            console.log(`   返回 ${records.length} 条武侠分类的剧目`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
        // 测试3: 搜索功能
        console.log('\n【测试3】搜索功能（搜索"总裁"）');
        path = '/api/appApi/filmDramaList' + buildQueryString({
            pageNo: 1,
            pageSize: 10,
            sysOrgCode: 'A01',
            searchValue: '总裁'
        });
        response = await httpGet(path, token);
        
        if (response.statusCode === 200 && response.data.success) {
            const result = response.data.result || {};
            const records = result.records || [];
            console.log(`✅ 成功！`);
            console.log(`   返回 ${records.length} 条包含"总裁"的剧目`);
        } else {
            console.error('❌ 失败！');
            console.error('   错误信息:', response.data.message || '未知错误');
        }
        
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('   错误:', error.message);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('='.repeat(60));
    console.log('推荐剧目列表API测试脚本');
    console.log('='.repeat(60));
    console.log(`服务器: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
    console.log('='.repeat(60));
    console.log('\n⚠️  提示：请确保已执行 test-data.sql 插入测试数据');
    console.log('='.repeat(60));
    
    // 先登录获取 token
    AUTH_TOKEN = await login();
    
    if (!AUTH_TOKEN) {
        console.error('\n❌ 登录失败，无法继续测试');
        process.exit(1);
    }
    
    console.log('\n✅ Token 已获取，开始测试 API...');
    console.log('='.repeat(60));
    
    // 依次测试各个接口
    await testCarouselList(AUTH_TOKEN);
    await testWinnowList(AUTH_TOKEN);
    await testHotDramaList(AUTH_TOKEN);
    await testFilmDlassifyList(AUTH_TOKEN);
    await testFilmDramaList(AUTH_TOKEN);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(60));
    console.log('\n📝 测试说明：');
    console.log('1. 轮播列表：返回精选剧目，默认10条，最多20条');
    console.log('2. 推荐剧目列表：返回所有精选剧目（dramaSign="2"）');
    console.log('3. 热门剧目列表：返回所有热门剧目（dramaSign="1"）');
    console.log('4. 分类列表：返回所有启用状态的分类');
    console.log('5. 分类剧集列表：支持分页和分类筛选');
    console.log('='.repeat(60));
}

// 运行主函数
main().catch((error) => {
    console.error('\n发生错误:', error);
    process.exit(1);
});

