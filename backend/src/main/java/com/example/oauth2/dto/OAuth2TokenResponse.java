package com.example.oauth2.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OAuth2TokenResponse {
    private String accessToken;
    private String refreshToken;
    private Integer expiresIn;
}
