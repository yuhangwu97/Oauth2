package com.example.oauth2.repository;

import com.example.oauth2.model.AuthProvider;
import com.example.oauth2.model.UserAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserAuthRepository extends JpaRepository<UserAuth, Long> {
    Optional<UserAuth> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
