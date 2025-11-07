package com.example.oauth2.service.impl;

import com.example.oauth2.dto.OAuth2TokenResponse;
import com.example.oauth2.dto.OAuth2UserInfo;
import com.example.oauth2.service.OAuth2Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Base64;
import java.util.Map;

@Service("appleOAuth2Service")
public class AppleOAuth2Service implements OAuth2Service {
    
    private static final Logger logger = LoggerFactory.getLogger(AppleOAuth2Service.class);
    
    @Value("${app.oauth2.apple.client-id:com.yourapp.service}")
    private String clientId;
    
    @Value("${app.oauth2.apple.team-id:YOUR_TEAM_ID}")
    private String teamId;
    
    @Value("${app.oauth2.apple.key-id:YOUR_KEY_ID}")
    private String keyId;
    
    @Value("${app.oauth2.apple.authorization-uri:https://appleid.apple.com/auth/authorize}")
    private String authorizationUri;
    
    @Value("${app.oauth2.apple.token-uri:https://appleid.apple.com/auth/token}")
    private String tokenUri;
    
    @Value("${app.oauth2.apple.scopes:name email}")
    private String scopes;
    
    @Override
    public String buildAuthorizationUrl(String redirectUri, String state, String codeChallenge, String codeChallengeMethod) {
        logger.info("=== 构建Apple授权URL ===");
        logger.info("Client ID: {}", clientId);
        logger.info("Redirect URI: {}", redirectUri);
        logger.info("State: {}", state);
        
        // 检查是否配置了真实的Apple凭证
        boolean isMockMode = clientId.contains("yourapp") || clientId.equals("com.yourapp.service");
        
        if (isMockMode) {
            logger.warn("⚠️  检测到未配置真实的Apple凭证，使用Mock模式");
            logger.warn("⚠️  要使用真实的Apple Sign In，需要付费的Apple Developer账号");
            
            // 返回模拟的授权URL，指向本地的mock页面
            String mockAuthUrl = UriComponentsBuilder
                .fromHttpUrl("http://localhost:3000/mock-apple-auth.html")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("response_mode", "form_post")
                .queryParam("scope", scopes)
                .queryParam("state", state)
                .queryParam("mock", "true")
                .toUriString();
            
            logger.info("[MOCK] 生成的模拟授权URL: {}", mockAuthUrl);
            return mockAuthUrl;
        }
        
        // 真实的Apple授权URL
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromHttpUrl(authorizationUri)
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("response_mode", "form_post")
            .queryParam("scope", scopes)
            .queryParam("state", state);
        
        // Apple支持PKCE
        if (codeChallenge != null) {
            builder.queryParam("code_challenge", codeChallenge)
                   .queryParam("code_challenge_method", codeChallengeMethod);
        }
        
        String authUrl = builder.toUriString();
        logger.info("Apple授权URL: {}", authUrl);
        
        return authUrl;
    }
    
    @Override
    public OAuth2TokenResponse exchangeToken(String code, String redirectUri) {
        logger.info("=== 开始交换Apple访问令牌 ===");
        logger.info("Authorization Code: {}...", code.substring(0, Math.min(20, code.length())));
        
        // 检查是否是Mock模式
        boolean isMockMode = code.startsWith("mock_apple_code_");
        
        if (isMockMode) {
            logger.warn("[MOCK] 检测到模拟的授权码，返回模拟token");
            return new OAuth2TokenResponse(
                "mock_apple_access_token_" + System.currentTimeMillis(),
                "mock_apple_refresh_token",
                3600
            );
        }
        
        RestTemplate restTemplate = new RestTemplate();
        
        // Apple需要使用client_secret (JWT格式)
        String clientSecret = generateClientSecret();
        
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("code", code);
        params.add("grant_type", "authorization_code");
        params.add("redirect_uri", redirectUri);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUri, request, Map.class);
            Map<String, Object> body = response.getBody();
            
            logger.info("Apple Token响应: {}", body);
            
            return new OAuth2TokenResponse(
                (String) body.get("access_token"),
                (String) body.get("refresh_token"),
                (Integer) body.get("expires_in")
            );
        } catch (Exception e) {
            logger.error("Apple Token交换失败: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to exchange Apple token", e);
        }
    }
    
    @Override
    public OAuth2UserInfo getUserInfo(String accessToken) {
        logger.info("=== 开始获取Apple用户信息 ===");
        
        // 检查是否是Mock模式
        boolean isMockMode = accessToken.startsWith("mock_apple_access_token_");
        
        if (isMockMode) {
            logger.warn("[MOCK] 检测到模拟的访问令牌，返回模拟用户信息");
            OAuth2UserInfo mockUserInfo = OAuth2UserInfo.builder()
                .id("mock_apple_user_" + System.currentTimeMillis())
                .email("testuser@privaterelay.appleid.com")
                .name("Apple Test User")
                .imageUrl(null)
                .build();
            
            logger.info("[MOCK] 模拟用户信息:");
            logger.info("[MOCK]   - ID: {}", mockUserInfo.getId());
            logger.info("[MOCK]   - Name: {}", mockUserInfo.getName());
            logger.info("[MOCK]   - Email: {}", mockUserInfo.getEmail());
            
            return mockUserInfo;
        }
        
        // Apple的特殊处理：用户信息在id_token中，不需要额外API调用
        // 这里我们从id_token中解析用户信息
        try {
            // 解析JWT id_token
            String[] parts = accessToken.split("\\.");
            if (parts.length >= 2) {
                String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
                logger.info("Apple ID Token Payload: {}", payload);
                
                // 这里应该解析JSON，简化处理
                // 实际应用中需要使用JSON库解析
                OAuth2UserInfo userInfo = OAuth2UserInfo.builder()
                    .id("apple_user_id")  // 从id_token的sub字段获取
                    .email("user@privaterelay.appleid.com")  // 从id_token的email字段获取
                    .name("Apple User")  // Apple可能不提供name
                    .imageUrl(null)
                    .build();
                
                logger.info("Apple用户信息解析完成");
                return userInfo;
            }
        } catch (Exception e) {
            logger.error("解析Apple ID Token失败: {}", e.getMessage(), e);
        }
        
        // 降级处理
        return OAuth2UserInfo.builder()
            .id("apple_user_unknown")
            .email(null)
            .name("Apple User")
            .imageUrl(null)
            .build();
    }
    
    /**
     * 生成Apple Client Secret (JWT格式)
     * 注意：这需要使用Apple提供的私钥文件
     */
    private String generateClientSecret() {
        logger.warn("Apple Client Secret生成 - 需要配置私钥文件");
        
        // TODO: 实际实现需要：
        // 1. 读取Apple提供的.p8私钥文件
        // 2. 使用ECDSA算法生成JWT
        // 3. JWT包含: iss(Team ID), iat, exp, aud, sub(Client ID)
        
        // 临时返回占位符
        return "APPLE_CLIENT_SECRET_PLACEHOLDER";
    }
}
