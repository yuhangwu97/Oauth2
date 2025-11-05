package com.example.oauth2.controller;

import com.example.oauth2.dto.*;
import com.example.oauth2.model.ClientPlatform;
import com.example.oauth2.model.User;
import com.example.oauth2.security.TokenProvider;
import com.example.oauth2.service.OAuth2Service;
import com.example.oauth2.service.OAuth2ServiceFactory;
import com.example.oauth2.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/auth/oauth2")
@CrossOrigin(origins = "*")
public class UnifiedOAuth2Controller {
    
    private static final Logger logger = LoggerFactory.getLogger(UnifiedOAuth2Controller.class);
    
    @Autowired
    private OAuth2ServiceFactory oauth2ServiceFactory;
    
    @Autowired
    private TokenProvider tokenProvider;
    
    @Autowired
    private RedisTemplate<String, OAuth2State> redisTemplate;
    
    @Autowired
    private UserService userService;
    
    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(@RequestBody OAuth2AuthRequest request) {
        logger.info("=== OAuth2 授权请求开始 ===");
        logger.info("Provider: {}, Platform: {}", request.getProvider(), request.getPlatform());
        logger.info("RedirectUri: {}", request.getRedirectUri());
        logger.info("State: {}", request.getState());
        
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            request.getProvider(), 
            request.getPlatform()
        );
        
        String authorizationUrl = oauth2Service.buildAuthorizationUrl(
            request.getRedirectUri(),
            request.getState(),
            request.getCodeChallenge(),
            request.getCodeChallengeMethod()
        );
        
        logger.info("生成的授权URL: {}", authorizationUrl);
        
        OAuth2State stateData = new OAuth2State(
            request.getProvider(),
            request.getPlatform(),
            request.getRedirectUri(),
            request.getCodeChallenge()
        );
        
        redisTemplate.opsForValue().set(
            "oauth2:state:" + request.getState(), 
            stateData, 
            5, 
            TimeUnit.MINUTES
        );
        
        logger.info("State数据已存储到Redis");
        logger.info("=== OAuth2 授权请求完成 ===");
        
        return ResponseEntity.ok(Map.of(
            "authorizationUrl", authorizationUrl,
            "state", request.getState()
        ));
    }
    
    @GetMapping("/callback/{provider}")
    public void callback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        
        logger.info("=== OAuth2 回调处理开始 ===");
        logger.info("Provider: {}", provider);
        logger.info("Code: {}", code.substring(0, Math.min(20, code.length())) + "...");
        logger.info("State: {}", state);
        
        OAuth2State stateData = redisTemplate.opsForValue().get("oauth2:state:" + state);
        if (stateData == null) {
            logger.error("State验证失败: 未找到对应的state数据");
            response.sendRedirect("http://localhost:3000/login?error=invalid_state");
            return;
        }
        
        logger.info("State验证成功, Provider: {}, Platform: {}", stateData.getProvider(), stateData.getPlatform());
        
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            stateData.getProvider(),
            stateData.getPlatform()
        );
        
        try {
            logger.info("开始交换访问令牌...");
            OAuth2TokenResponse tokenResponse = oauth2Service.exchangeToken(code, stateData.getRedirectUri());
            logger.info("访问令牌交换成功, AccessToken: {}...", 
                tokenResponse.getAccessToken().substring(0, Math.min(20, tokenResponse.getAccessToken().length())));
            
            logger.info("开始获取用户信息...");
            OAuth2UserInfo userInfo = oauth2Service.getUserInfo(tokenResponse.getAccessToken());
            logger.info("用户信息获取成功:");
            logger.info("  - ID: {}", userInfo.getId());
            logger.info("  - Name: {}", userInfo.getName());
            logger.info("  - Email: {}", userInfo.getEmail());
            logger.info("  - ImageUrl: {}", userInfo.getImageUrl());
            
            User user = userService.findOrCreateUser(
                userInfo,
                stateData.getProvider(),
                stateData.getPlatform()
            );
            logger.info("用户创建/查找成功, UserID: {}", user.getId());
            
            String jwt = tokenProvider.createToken(user, stateData.getPlatform());
            logger.info("JWT令牌生成成功");
            
            // 根据平台类型选择重定向方式
            String redirectUrl = buildRedirectUrl(stateData.getPlatform(), jwt);
            logger.info("重定向到: {}", redirectUrl);
            response.sendRedirect(redirectUrl);
            
            logger.info("=== OAuth2 回调处理成功完成 ===");
            
        } catch (Exception e) {
            logger.error("OAuth2 回调处理失败: {}", e.getMessage(), e);
            response.sendRedirect(stateData.getRedirectUri() + "?error=" + e.getMessage());
        } finally {
            redisTemplate.delete("oauth2:state:" + state);
            logger.info("State数据已清理");
        }
    }
    
    @PostMapping("/token")
    public ResponseEntity<?> exchangeToken(@RequestBody OAuth2TokenRequest request) {
        OAuth2State stateData = redisTemplate.opsForValue().get("oauth2:state:" + request.getState());
        if (stateData == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired state"));
        }
        
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            request.getProvider(),
            request.getPlatform()
        );
        
        try {
            OAuth2TokenResponse tokenResponse = oauth2Service.exchangeToken(
                request.getCode(),
                stateData.getRedirectUri()
            );
            
            OAuth2UserInfo userInfo = oauth2Service.getUserInfo(tokenResponse.getAccessToken());
            
            User user = userService.findOrCreateUser(
                userInfo,
                request.getProvider(),
                request.getPlatform()
            );
            
            String jwt = tokenProvider.createToken(user, request.getPlatform());
            
            UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .imageUrl(user.getImageUrl())
                .build();
            
            return ResponseEntity.ok(Map.of(
                "token", jwt,
                "user", userDTO
            ));
            
        } finally {
            redisTemplate.delete("oauth2:state:" + request.getState());
        }
    }
    
    /**
     * 根据平台类型构建重定向URL
     * 统一重定向到成功页面，由前端处理不同平台的逻辑
     */
    private String buildRedirectUrl(ClientPlatform platform, String jwt) {
        // 所有平台都重定向到同一个成功页面
        // 页面会根据环境(WebView/浏览器/小程序)自动处理token传递
        return "http://localhost:3000/oauth2/success?token=" + jwt + "&platform=" + platform.name();
    }
}
