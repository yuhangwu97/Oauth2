package com.example.oauth2.controller;

import com.example.oauth2.dto.*;
import com.example.oauth2.model.User;
import com.example.oauth2.security.TokenProvider;
import com.example.oauth2.service.OAuth2Service;
import com.example.oauth2.service.OAuth2ServiceFactory;
import com.example.oauth2.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController
@RequestMapping("/oauth/callback")
@CrossOrigin(origins = "*")
public class OAuthCallbackController {
    
    @Autowired
    private OAuth2ServiceFactory oauth2ServiceFactory;
    
    @Autowired
    private TokenProvider tokenProvider;
    
    @Autowired
    private RedisTemplate<String, OAuth2State> redisTemplate;
    
    @Autowired
    private UserService userService;
    
    /**
     * Google 回调端点 - 匹配 Google Console 配置
     * https://yourapp.com/oauth/callback/google
     */
    @GetMapping("/{provider}")
    public void googleCallback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        
        OAuth2State stateData = redisTemplate.opsForValue().get("oauth2:state:" + state);
        if (stateData == null) {
            response.sendRedirect("http://localhost:3000/login?error=invalid_state");
            return;
        }
        
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            stateData.getProvider(),
            stateData.getPlatform()
        );
        
        try {
            OAuth2TokenResponse tokenResponse = oauth2Service.exchangeToken(code, stateData.getRedirectUri());
            OAuth2UserInfo userInfo = oauth2Service.getUserInfo(tokenResponse.getAccessToken());
            
            User user = userService.findOrCreateUser(
                userInfo,
                stateData.getProvider(),
                stateData.getPlatform()
            );
            
            String jwt = tokenProvider.createToken(user, stateData.getPlatform());
            
            // 重定向到前端
            String redirectUrl = "http://localhost:3000/oauth2/redirect?token=" + jwt;
            response.sendRedirect(redirectUrl);
            
        } catch (Exception e) {
            response.sendRedirect("http://localhost:3000/login?error=" + e.getMessage());
        } finally {
            redisTemplate.delete("oauth2:state:" + state);
        }
    }
}
