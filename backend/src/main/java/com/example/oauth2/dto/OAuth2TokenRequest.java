package com.example.oauth2.dto;

import com.example.oauth2.model.AuthProvider;
import com.example.oauth2.model.ClientPlatform;
import lombok.Data;

@Data
public class OAuth2TokenRequest {
    private AuthProvider provider;
    private ClientPlatform platform;
    private String code;
    private String state;
    private String codeVerifier;
}
