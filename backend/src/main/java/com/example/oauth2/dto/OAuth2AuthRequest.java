package com.example.oauth2.dto;

import com.example.oauth2.model.AuthProvider;
import com.example.oauth2.model.ClientPlatform;
import lombok.Data;

@Data
public class OAuth2AuthRequest {
    private AuthProvider provider;
    private ClientPlatform platform;
    private String redirectUri;
    private String state;
    private String codeChallenge;
    private String codeChallengeMethod;
}
