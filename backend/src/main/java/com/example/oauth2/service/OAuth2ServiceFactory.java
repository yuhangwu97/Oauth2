package com.example.oauth2.service;

import com.example.oauth2.model.AuthProvider;
import com.example.oauth2.model.ClientPlatform;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class OAuth2ServiceFactory {
    
    @Autowired
    private Map<String, OAuth2Service> serviceMap;
    
    public OAuth2Service getService(AuthProvider provider, ClientPlatform platform) {
        String key = provider.name().toLowerCase() + "OAuth2Service";
        
        OAuth2Service service = serviceMap.get(key);
        if (service == null) {
            throw new UnsupportedOperationException("OAuth2 provider " + provider + " not supported");
        }
        
        return service;
    }
}
