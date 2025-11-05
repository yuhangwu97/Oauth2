package com.example.oauth2.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OAuth2UserInfo {
    private String id;
    private String email;
    private String name;
    private String imageUrl;
}
