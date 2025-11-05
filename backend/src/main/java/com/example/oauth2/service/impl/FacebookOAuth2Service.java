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
import java.util.Map;

@Service("facebookOAuth2Service")
public class FacebookOAuth2Service implements OAuth2Service {
    
    private static final Logger logger = LoggerFactory.getLogger(FacebookOAuth2Service.class);
    
    @Value("${app.oauth2.facebook.client-id}")
    private String clientId;
    
    @Value("${app.oauth2.facebook.client-secret}")
    private String clientSecret;
    
    @Value("${app.oauth2.facebook.authorization-uri}")
    private String authorizationUri;
    
    @Value("${app.oauth2.facebook.token-uri}")
    private String tokenUri;
    
    @Value("${app.oauth2.facebook.user-info-uri}")
    private String userInfoUri;
    
    @Value("${app.oauth2.facebook.scopes}")
    private String scopes;
    
    @Override
    public String buildAuthorizationUrl(String redirectUri, String state, String codeChallenge, String codeChallengeMethod) {
        return UriComponentsBuilder
            .fromHttpUrl(authorizationUri)
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("scope", scopes)
            .queryParam("state", state)
            .toUriString();
    }
    
    @Override
    public OAuth2TokenResponse exchangeToken(String code, String redirectUri) {
        RestTemplate restTemplate = new RestTemplate();
        
        String url = UriComponentsBuilder
            .fromHttpUrl(tokenUri)
            .queryParam("client_id", clientId)
            .queryParam("client_secret", clientSecret)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("code", code)
            .toUriString();
        
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = response.getBody();
        
        return new OAuth2TokenResponse(
            (String) body.get("access_token"),
            null,
            (Integer) body.get("expires_in")
        );
    }
    
    @Override
    public OAuth2UserInfo getUserInfo(String accessToken) {
        logger.info("=== 开始获取Facebook用户信息 ===");
        logger.info("UserInfo API: {}", userInfoUri);
        logger.info("AccessToken: {}...", accessToken.substring(0, Math.min(20, accessToken.length())));
        
        RestTemplate restTemplate = new RestTemplate();
        
        String url = userInfoUri + "&access_token=" + accessToken;
        logger.info("完整请求URL: {}", url);
        
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        
        Map<String, Object> body = response.getBody();
        logger.info("Facebook API响应: {}", body);
        
        OAuth2UserInfo userInfo = OAuth2UserInfo.builder()
            .id((String) body.get("id"))
            .email((String) body.get("email"))
            .name((String) body.get("name"))
            .imageUrl(null)  // 不使用头像
            .build();
            
        logger.info("解析后的用户信息:");
        logger.info("  - ID: {}", userInfo.getId());
        logger.info("  - Name: {}", userInfo.getName());
        logger.info("  - Email: {}", userInfo.getEmail());
        logger.info("  - Picture: {}", userInfo.getImageUrl());
        logger.info("=== Facebook用户信息获取完成 ===");
        
        return userInfo;
    }
}
