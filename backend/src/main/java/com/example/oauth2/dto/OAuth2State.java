package com.example.oauth2.dto;

import com.example.oauth2.model.AuthProvider;
import com.example.oauth2.model.ClientPlatform;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OAuth2State implements Serializable {
    private AuthProvider provider;
    private ClientPlatform platform;
    private String redirectUri;
    private String codeChallenge;
}
