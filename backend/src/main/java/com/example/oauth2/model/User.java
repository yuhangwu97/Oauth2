package com.example.oauth2.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String email;
    private String phone;
    @Column(length = 500)
    private String imageUrl;
    
    @Enumerated(EnumType.STRING)
    private AuthProvider primaryProvider;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserAuth> authAccounts = new ArrayList<>();
}
