#!/usr/bin/env node

/**
 * 邮箱注册、登录和重置密码测试脚本
 * 
 * 功能：
 * 1. 发送注册验证码（emailmode="1"）
 * 2. 邮箱注册
 * 3. 发送登录验证码（emailmode="0"）
 * 4. 邮箱验证码登录
 * 5. 邮箱密码登录
 * 6. 发送忘记密码验证码（emailmode="2"）
 * 7. 重置密码
 * 8. 注销账户（需要先登录获取token）
 * 
 * 使用方法:
 *   node email-register-login-reset.js
 * 
 * 注意:
 *   - 服务器地址: http://localhost:9080
 *   - 邮箱固定为: 1901744672@qq.com
 *   - 脚本会依次执行上述步骤，需要手动输入验证码
 *   - 注销账户会永久删除所有数据，请谨慎操作
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

// 固定邮箱
const EMAIL = '1901744672@qq.com';

/**
 * 发送 HTTP 请求
 * @param {string} path - 请求路径
 * @param {string} method - 请求方法
 * @param {object} data - 请求数据
 * @param {string} token - 可选的token（用于需要认证的请求）
 */
function httpRequest(path, method, data, token) {
    return new Promise((resolve, reject) => {
        const headers = { ...SERVER_CONFIG.headers };
        
        // 如果提供了token，添加到请求头
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
 * 发送邮箱验证码
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendEmailCode(email, emailmode, modeName) {
    console.log(`\n📧 ${modeName} - 正在发送验证码到: ${email}...`);
    
    const data = {
        email: email,
        emailmode: emailmode
    };
    
    try {
        const response = await httpRequest('/api/sys/sendEmailCode', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 验证码发送成功！');
            console.log('📬 请查收邮件，验证码有效期为10分钟');
            return { success: true };
        } else {
            const errorMessage = response.data.message || '未知错误';
            console.error('❌ 验证码发送失败！');
            console.error('错误信息:', errorMessage);
            console.error('完整响应:', JSON.stringify(response.data, null, 2));
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('错误:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('提示: 请确保后端服务已启动，并且运行在 http://localhost:9080');
        }
        
        return { success: false, message: error.message };
    }
}

/**
 * 邮箱注册
 */
async function register(email, emailcode, username, password, realname) {
    console.log(`\n📝 正在注册用户...`);
    console.log(`邮箱: ${email}`);
    console.log(`用户名: ${username || email}`);
    
    const data = {
        email: email,
        emailcode: emailcode
    };
    
    if (username) {
        data.username = username;
    }
    
    if (password) {
        data.password = password;
    }
    
    if (realname) {
        data.realname = realname;
    }
    
    try {
        const response = await httpRequest('/api/sys/user/register', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 注册成功！');
            console.log('返回数据:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            console.error('❌ 注册失败！');
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
 * 邮箱登录（验证码登录）
 * @returns {Promise<{success: boolean, token?: string}>}
 */
async function emailLoginWithCode(email, captcha) {
    console.log(`\n🔑 正在使用验证码登录...`);
    console.log(`邮箱: ${email}`);
    
    const data = {
        email: email,
        loginType: 'code',
        captcha: captcha
    };
    
    try {
        const response = await httpRequest('/api/sys/emailLogin', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 验证码登录成功！');
            console.log('返回数据:', JSON.stringify(response.data, null, 2));
            
            let token = null;
            if (response.data.result && response.data.result.token) {
                token = response.data.result.token;
                console.log('\n📝 Token:');
                console.log(token);
                console.log('\n📋 使用方式:');
                console.log(`在请求头中添加: Authorization: Bearer ${token}`);
            }
            
            return { success: true, token: token };
        } else {
            console.error('❌ 验证码登录失败！');
            console.error('错误信息:', response.data.message || '未知错误');
            console.error('完整响应:', JSON.stringify(response.data, null, 2));
            return { success: false };
        }
    } catch (error) {
        console.error('❌ 请求失败！');
        console.error('错误:', error.message);
        return { success: false };
    }
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
            console.log('返回数据:', JSON.stringify(response.data, null, 2));
            
            if (response.data.result && response.data.result.token) {
                const token = response.data.result.token;
                console.log('\n📝 Token:');
                console.log(token);
                console.log('\n📋 使用方式:');
                console.log(`在请求头中添加: Authorization: Bearer ${token}`);
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
 * 重置密码
 */
async function resetPassword(email, emailcode, password, confirmpassword) {
    console.log(`\n🔐 正在重置密码...`);
    console.log(`邮箱: ${email}`);
    
    const data = {
        email: email,
        emailcode: emailcode,
        password: password,
        confirmpassword: confirmpassword
    };
    
    try {
        const response = await httpRequest('/api/sys/user/resetPasswordByEmail', 'POST', data);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 密码重置成功！');
            console.log('返回数据:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            console.error('❌ 密码重置失败！');
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
 * 注销账户
 * @param {string} token - 登录后获取的token
 */
async function deleteAccount(token) {
    console.log(`\n🗑️  正在注销账户...`);
    console.log('⚠️  警告：此操作将永久删除所有相关数据，包括：');
    console.log('   - 会员数据（金币、积分、VIP权益等）');
    console.log('   - 所有充值历史记录');
    console.log('   - 所有观看历史记录');
    console.log('   - 搜索历史记录');
    console.log('   - 用户名和邮箱将被脱敏处理');
    
    const data = {
        confirmed: true
    };
    
    try {
        const response = await httpRequest('/api/sys/user/deleteAccount', 'POST', data, token);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ 账户注销成功！');
            console.log('返回数据:', JSON.stringify(response.data, null, 2));
            console.log('⚠️  所有相关数据已删除，token已失效');
            return true;
        } else {
            console.error('❌ 账户注销失败！');
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
    console.log('邮箱注册、登录和重置密码测试脚本');
    console.log('='.repeat(60));
    console.log(`邮箱: ${EMAIL}`);
    console.log(`服务器: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
    console.log('='.repeat(60));
    
    let password = undefined; // 用于后续登录的密码
    let token = undefined; // 用于注销账户的token
    
    // 步骤1: 发送注册验证码
    console.log('\n【步骤 1/8】发送注册验证码');
    const sendRegisterCodeResult = await sendEmailCode(EMAIL, '1', '注册模式');
    
    if (!sendRegisterCodeResult.success) {
        // 检查是否是"邮箱已经注册"的错误
        if (sendRegisterCodeResult.message && sendRegisterCodeResult.message.includes('已经注册')) {
            console.log('\n✅ 检测到邮箱已注册，跳过注册步骤，直接进行登录测试');
            console.log('提示: 密码登录需要您提供密码，或使用验证码登录');
            password = await question('\n请输入密码（用于密码登录测试，直接回车跳过密码登录）: ');
            password = password.trim() || undefined;
        } else {
            console.error('\n❌ 发送注册验证码失败，脚本终止');
            process.exit(1);
        }
    } else {
        // 注册验证码发送成功，继续注册流程
        // 获取注册验证码
        const registerCode = await question('\n请输入注册验证码（6位数字）: ');
        if (!registerCode || registerCode.trim().length === 0) {
            console.error('❌ 验证码不能为空');
            process.exit(1);
        }
        
        // 步骤2: 邮箱注册
        console.log('\n【步骤 2/8】邮箱注册');
        const username = await question('请输入用户名（直接回车使用邮箱作为用户名）: ');
        password = await question('请输入密码（直接回车自动生成）: ');
        password = password.trim() || undefined;
        const realname = await question('请输入真实姓名（可选，直接回车跳过）: ');
        
        const registerSuccess = await register(
            EMAIL,
            registerCode.trim(),
            username.trim() || undefined,
            password,
            realname.trim() || undefined
        );
        
        if (!registerSuccess) {
            console.error('\n❌ 注册失败，脚本终止');
            process.exit(1);
        }
        
        // 如果注册时没有设置密码，使用默认密码
        if (!password) {
            password = '123456'; // 默认密码
            console.log(`\n提示: 注册时未设置密码，使用默认密码: ${password}`);
        }
        
        // 等待一下，避免操作过快
        console.log('\n等待3秒后继续...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // 步骤3: 发送登录验证码
    console.log('\n【步骤 3/8】发送登录验证码');
    const sendLoginCodeResult = await sendEmailCode(EMAIL, '0', '登录模式');
    
    if (!sendLoginCodeResult.success) {
        console.error('\n❌ 发送登录验证码失败，脚本终止');
        process.exit(1);
    }
    
    // 获取登录验证码
    const loginCode = await question('\n请输入登录验证码（6位数字）: ');
    if (!loginCode || loginCode.trim().length === 0) {
        console.error('❌ 验证码不能为空');
        process.exit(1);
    }
    
    // 步骤4: 邮箱验证码登录
    console.log('\n【步骤 4/8】邮箱验证码登录');
    const loginWithCodeResult = await emailLoginWithCode(EMAIL, loginCode.trim());
    
    if (!loginWithCodeResult.success) {
        console.error('\n❌ 验证码登录失败');
        process.exit(1);
    }
    
    // 保存验证码登录获取的token
    if (loginWithCodeResult.token) {
        token = loginWithCodeResult.token;
        console.log('📝 Token已保存，可用于注销账户');
    }
    
    // 等待一下，避免操作过快
    console.log('\n等待3秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 步骤5: 邮箱密码登录
    if (password) {
        console.log('\n【步骤 5/8】邮箱密码登录');
        const loginPassword = await question(`请输入密码（直接回车使用: ${password}）: `);
        const finalPassword = loginPassword.trim() || password;
        
        // 为了获取token，我们需要重新调用登录接口并保存token
        const loginData = {
            email: EMAIL,
            loginType: 'password',
            password: finalPassword
        };
        
        try {
            const loginResponse = await httpRequest('/api/sys/emailLogin', 'POST', loginData);
            if (loginResponse.statusCode === 200 && loginResponse.data.success) {
                if (loginResponse.data.result && loginResponse.data.result.token) {
                    token = loginResponse.data.result.token;
                    console.log('✅ 密码登录成功！');
                    console.log('📝 Token已保存，可用于注销账户');
                } else {
                    console.log('✅ 密码登录成功！');
                    console.log('⚠️  未获取到token，注销账户功能可能无法使用');
                }
            } else {
                console.error('❌ 密码登录失败！');
                console.error('错误信息:', loginResponse.data.message || '未知错误');
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ 请求失败！');
            console.error('错误:', error.message);
            process.exit(1);
        }
    } else {
        console.log('\n【步骤 5/8】跳过邮箱密码登录（未提供密码）');
        console.log('⚠️  提示：注销账户需要token，请先完成登录');
    }
    
    // 等待一下，避免操作过快
    console.log('\n等待3秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 步骤6: 发送忘记密码验证码
    console.log('\n【步骤 6/8】发送忘记密码验证码');
    const sendResetCodeResult = await sendEmailCode(EMAIL, '2', '忘记密码模式');
    
    if (!sendResetCodeResult.success) {
        console.error('\n❌ 发送忘记密码验证码失败，脚本终止');
        process.exit(1);
    }
    
    // 获取重置密码验证码
    const resetCode = await question('\n请输入忘记密码验证码（6位数字）: ');
    if (!resetCode || resetCode.trim().length === 0) {
        console.error('❌ 验证码不能为空');
        process.exit(1);
    }
    
    // 步骤7: 重置密码
    console.log('\n【步骤 7/8】重置密码');
    let newPassword = await question('请输入新密码: ');
    if (!newPassword || newPassword.trim().length === 0) {
        console.error('❌ 新密码不能为空');
        process.exit(1);
    }
    
    let confirmPassword = await question('请再次输入新密码确认: ');
    if (!confirmPassword || confirmPassword.trim().length === 0) {
        console.error('❌ 确认密码不能为空');
        process.exit(1);
    }
    
    if (newPassword.trim() !== confirmPassword.trim()) {
        console.error('❌ 两次输入的密码不一致');
        process.exit(1);
    }
    
    const resetSuccess = await resetPassword(
        EMAIL,
        resetCode.trim(),
        newPassword.trim(),
        confirmPassword.trim()
    );
    
    if (!resetSuccess) {
        console.error('\n❌ 重置密码失败');
        process.exit(1);
    }
    
    // 等待一下，避免操作过快
    console.log('\n等待3秒后继续...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 步骤8: 注销账户（可选）
    console.log('\n【步骤 8/8】注销账户（可选）');
    console.log('⚠️  警告：注销账户会永久删除所有数据，无法恢复！');
    
    if (!token) {
        console.log('⚠️  未获取到token，无法测试注销账户功能');
        console.log('提示：请先完成密码登录以获取token');
    } else {
        const confirmDelete = await question('\n是否要测试注销账户功能？(yes/no，默认no): ');
        if (confirmDelete.trim().toLowerCase() === 'yes') {
            const finalConfirm = await question('⚠️  再次确认：此操作将永久删除所有数据，无法恢复！输入 "DELETE" 确认: ');
            if (finalConfirm.trim() === 'DELETE') {
                const deleteSuccess = await deleteAccount(token);
                if (!deleteSuccess) {
                    console.error('\n❌ 注销账户失败');
                } else {
                    console.log('\n✅ 账户已注销，所有数据已删除');
                    console.log('⚠️  token已失效，如需继续使用，请重新注册');
                }
            } else {
                console.log('已取消注销账户操作');
            }
        } else {
            console.log('已跳过注销账户测试');
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有步骤执行完成！');
    console.log('='.repeat(60));
    console.log(`邮箱: ${EMAIL}`);
    if (newPassword) {
        console.log(`新密码: ${newPassword.trim()}`);
    }
    console.log('='.repeat(60));
}

// 运行主函数
main().catch((error) => {
    console.error('\n发生错误:', error);
    process.exit(1);
});

