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

@Service("googleOAuth2Service")
public class GoogleOAuth2Service implements OAuth2Service {
    
    private static final Logger logger = LoggerFactory.getLogger(GoogleOAuth2Service.class);
    
    @Value("${app.oauth2.google.client-id}")
    private String clientId;
    
    @Value("${app.oauth2.google.client-secret}")
    private String clientSecret;
    
    @Value("${app.oauth2.google.authorization-uri}")
    private String authorizationUri;
    
    @Value("${app.oauth2.google.token-uri}")
    private String tokenUri;
    
    @Value("${app.oauth2.google.user-info-uri}")
    private String userInfoUri;
    
    @Value("${app.oauth2.google.scopes}")
    private String scopes;
    
    @Override
    public String buildAuthorizationUrl(String redirectUri, String state, String codeChallenge, String codeChallengeMethod) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromHttpUrl(authorizationUri)
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("scope", scopes)
            .queryParam("state", state);
        
        if (codeChallenge != null) {
            builder.queryParam("code_challenge", codeChallenge)
                   .queryParam("code_challenge_method", codeChallengeMethod);
        }
        
        return builder.toUriString();
    }
    
    @Override
    public OAuth2TokenResponse exchangeToken(String code, String redirectUri) {
        RestTemplate restTemplate = new RestTemplate();
        
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("grant_type", "authorization_code");
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUri, request, Map.class);
        Map<String, Object> body = response.getBody();
        
        return new OAuth2TokenResponse(
            (String) body.get("access_token"),
            (String) body.get("refresh_token"),
            (Integer) body.get("expires_in")
        );
    }
    
    @Override
    public OAuth2UserInfo getUserInfo(String accessToken) {
        logger.info("=== 开始获取Google用户信息 ===");
        logger.info("UserInfo API: {}", userInfoUri);
        logger.info("AccessToken: {}...", accessToken.substring(0, Math.min(20, accessToken.length())));
        
        RestTemplate restTemplate = new RestTemplate();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<Map> response = restTemplate.exchange(
            userInfoUri,
            HttpMethod.GET,
            entity,
            Map.class
        );
        
        Map<String, Object> body = response.getBody();
        logger.info("Google API响应: {}", body);
        
        OAuth2UserInfo userInfo = OAuth2UserInfo.builder()
            .id((String) body.get("sub"))  // OpenID Connect使用'sub'而不是'id'
            .email((String) body.get("email"))
            .name((String) body.get("name"))
            .imageUrl((String) body.get("picture"))
            .build();
            
        logger.info("解析后的用户信息:");
        logger.info("  - ID: {}", userInfo.getId());
        logger.info("  - Name: {}", userInfo.getName());
        logger.info("  - Email: {}", userInfo.getEmail());
        logger.info("  - Picture: {}", userInfo.getImageUrl());
        logger.info("=== Google用户信息获取完成 ===");
        
        return userInfo;
    }
}
