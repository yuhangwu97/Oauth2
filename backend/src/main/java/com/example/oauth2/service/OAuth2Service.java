package com.example.oauth2.service;

import com.example.oauth2.dto.OAuth2TokenResponse;
import com.example.oauth2.dto.OAuth2UserInfo;

public interface OAuth2Service {
    String buildAuthorizationUrl(String redirectUri, String state, String codeChallenge, String codeChallengeMethod);
    OAuth2TokenResponse exchangeToken(String code, String redirectUri);
    OAuth2UserInfo getUserInfo(String accessToken);
}
