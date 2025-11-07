package com.example.oauth2.service.impl;

import com.example.oauth2.dto.OAuth2TokenResponse;
import com.example.oauth2.dto.OAuth2UserInfo;
import com.example.oauth2.service.OAuth2Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Apple OAuth2 Mock服务 - 用于开发测试
 * 
 * 使用方法：
 * 1. 在application.yml中设置 spring.profiles.active=dev
 * 2. 或者在启动时添加 --spring.profiles.active=dev
 * 
 * 这个Mock服务会模拟Apple Sign In的完整流程，
 * 但不需要真实的Apple Developer账号。
 */
@Service("appleOAuth2ServiceMock")
@Profile("dev")  // 只在dev环境启用
@Primary  // 优先使用这个实现
public class AppleOAuth2ServiceMock implements OAuth2Service {
    
    private static final Logger logger = LoggerFactory.getLogger(AppleOAuth2ServiceMock.class);
    
    @Override
    public String buildAuthorizationUrl(String redirectUri, String state, 
                                       String codeChallenge, String codeChallengeMethod) {
        logger.info("=== [MOCK] 构建Apple授权URL ===");
        logger.info("[MOCK] 这是模拟的Apple授权流程");
        logger.info("[MOCK] Redirect URI: {}", redirectUri);
        logger.info("[MOCK] State: {}", state);
        
        // 返回一个模拟的授权URL
        // 实际上这个URL不会真正跳转到Apple
        String mockAuthUrl = UriComponentsBuilder
            .fromHttpUrl("http://localhost:3000/mock-apple-auth")
            .queryParam("client_id", "com.yourapp.service.mock")
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("response_mode", "form_post")
            .queryParam("scope", "name email")
            .queryParam("state", state)
            .queryParam("mock", "true")
            .toUriString();
        
        logger.info("[MOCK] 生成的模拟授权URL: {}", mockAuthUrl);
        logger.warn("⚠️  这是MOCK服务，不会真正跳转到Apple授权页面");
        logger.warn("⚠️  要使用真实的Apple Sign In，需要付费的Apple Developer账号");
        
        return mockAuthUrl;
    }
    
    @Override
    public OAuth2TokenResponse exchangeToken(String code, String redirectUri) {
        logger.info("=== [MOCK] 交换Apple访问令牌 ===");
        logger.info("[MOCK] Authorization Code: {}", code);
        logger.info("[MOCK] 返回模拟的访问令牌");
        
        // 返回模拟的token
        return new OAuth2TokenResponse(
            "mock_apple_access_token_" + System.currentTimeMillis(),
            "mock_apple_refresh_token",
            3600
        );
    }
    
    @Override
    public OAuth2UserInfo getUserInfo(String accessToken) {
        logger.info("=== [MOCK] 获取Apple用户信息 ===");
        logger.info("[MOCK] Access Token: {}", accessToken);
        
        // 返回模拟的用户信息
        OAuth2UserInfo mockUserInfo = OAuth2UserInfo.builder()
            .id("mock_apple_user_" + System.currentTimeMillis())
            .email("testuser@privaterelay.appleid.com")
            .name("Apple Test User")
            .imageUrl(null)
            .build();
        
        logger.info("[MOCK] 返回模拟的用户信息:");
        logger.info("[MOCK]   - ID: {}", mockUserInfo.getId());
        logger.info("[MOCK]   - Name: {}", mockUserInfo.getName());
        logger.info("[MOCK]   - Email: {}", mockUserInfo.getEmail());
        logger.warn("⚠️  这是MOCK数据，不是真实的Apple用户信息");
        
        return mockUserInfo;
    }
}
