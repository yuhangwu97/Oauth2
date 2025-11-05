package com.example.oauth2.security;

import com.example.oauth2.model.ClientPlatform;
import com.example.oauth2.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;

@Component
public class TokenProvider {
    
    @Value("${app.auth.jwt.secret}")
    private String tokenSecret;
    
    @Value("${app.auth.jwt.expiration.web}")
    private long webExpiration;
    
    @Value("${app.auth.jwt.expiration.mobile}")
    private long mobileExpiration;
    
    @Value("${app.auth.jwt.expiration.miniapp}")
    private long miniappExpiration;
    
    public String createToken(User user, ClientPlatform platform) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + getExpirationTime(platform));
        
        Key key = Keys.hmacShaKeyFor(tokenSecret.getBytes());
        
        return Jwts.builder()
            .setSubject(Long.toString(user.getId()))
            .claim("platform", platform.name())
            .claim("email", user.getEmail())
            .claim("name", user.getName())
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }
    
    public Long getUserIdFromToken(String token) {
        Key key = Keys.hmacShaKeyFor(tokenSecret.getBytes());
        
        Claims claims = Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .getBody();
        
        return Long.parseLong(claims.getSubject());
    }
    
    public boolean validateToken(String authToken) {
        try {
            Key key = Keys.hmacShaKeyFor(tokenSecret.getBytes());
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }
    
    private long getExpirationTime(ClientPlatform platform) {
        return switch (platform) {
            case WEB, H5 -> webExpiration;
            case IOS, ANDROID -> mobileExpiration;
            case WECHAT_MINIAPP, DOUYIN_MINIAPP -> miniappExpiration;
        };
    }
}
