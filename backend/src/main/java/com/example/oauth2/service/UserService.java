package com.example.oauth2.service;

import com.example.oauth2.dto.OAuth2UserInfo;
import com.example.oauth2.model.AuthProvider;
import com.example.oauth2.model.ClientPlatform;
import com.example.oauth2.model.User;
import com.example.oauth2.model.UserAuth;
import com.example.oauth2.repository.UserAuthRepository;
import com.example.oauth2.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserAuthRepository userAuthRepository;
    
    @Transactional
    public User findOrCreateUser(OAuth2UserInfo userInfo, AuthProvider provider, ClientPlatform platform) {
        UserAuth userAuth = userAuthRepository
            .findByProviderAndProviderUserId(provider, userInfo.getId())
            .orElse(null);
        
        if (userAuth != null) {
            userAuth.setLastLoginAt(LocalDateTime.now());
            userAuthRepository.save(userAuth);
            return userAuth.getUser();
        }
        
        User user = userRepository.findByEmail(userInfo.getEmail()).orElse(null);
        
        if (user == null) {
            user = new User();
            user.setName(userInfo.getName());
            user.setEmail(userInfo.getEmail());
            user.setImageUrl(userInfo.getImageUrl());
            user.setPrimaryProvider(provider);
            user = userRepository.save(user);
        }
        
        userAuth = new UserAuth();
        userAuth.setUser(user);
        userAuth.setProvider(provider);
        userAuth.setPlatform(platform);
        userAuth.setProviderUserId(userInfo.getId());
        userAuth.setEmail(userInfo.getEmail());
        userAuth.setName(userInfo.getName());
        userAuth.setImageUrl(userInfo.getImageUrl());
        userAuthRepository.save(userAuth);
        
        return user;
    }
}
