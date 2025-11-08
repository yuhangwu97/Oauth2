import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './OAuth2RedirectHandler.css';

/**
 * OAuth2 回调处理组件
 * 处理 OAuth2 登录成功/失败后的重定向
 * 
 * 成功回调：/oauth2/success?token=xxx
 * 失败回调：/login?error=xxx（由后端重定向）
 */
function OAuth2RedirectHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      // 成功：保存 Token 并跳转
      try {
        localStorage.setItem('accessToken', token);
        console.log('OAuth2 登录成功，Token 已保存');
        
        // 清理 OAuth2 相关临时数据
        sessionStorage.removeItem('oauth2_state');
        
        setStatus('success');
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 1500);
      } catch (err) {
        console.error('保存 Token 失败:', err);
        setStatus('error');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    } else if (error) {
      // 失败：显示错误信息
      console.error('OAuth2 登录失败:', error);
      setStatus('error');
      
      // 清理 OAuth2 相关临时数据
      sessionStorage.removeItem('oauth2_state');
      sessionStorage.removeItem('oauth2_code_verifier');
      
      // 延迟跳转，让用户看到错误提示
      setTimeout(() => {
        navigate('/login', { 
          replace: true,
          state: { error: error }
        });
      }, 2000);
    } else {
      // 无参数：可能是直接访问，跳转到登录页
      console.warn('OAuth2 回调缺少必要参数');
      navigate('/login', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="redirect-container">
      <div className="spinner"></div>
      {status === 'processing' && <p>正在处理登录...</p>}
      {status === 'success' && (
        <div>
          <p className="success-message">✓ 登录成功！</p>
          <p className="redirect-message">正在跳转...</p>
        </div>
      )}
      {status === 'error' && (
        <div>
          <p className="error-message">✗ 登录失败</p>
          <p className="redirect-message">正在返回登录页...</p>
        </div>
      )}
    </div>
  );
}

export default OAuth2RedirectHandler;
