package com.event.userservice.service;


import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.event.userservice.entity.Credential;
import com.event.userservice.entity.User;
import com.event.userservice.repository.CredentialRepository;
import com.event.userservice.repository.UserRepository;
import com.event.userservice.security.JwtUtil;

@Service
public class UserService {
    private final UserRepository userRepo;
    private final CredentialRepository credRepo;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UserService(UserRepository userRepo, CredentialRepository credRepo, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.credRepo = credRepo;
        this.jwtUtil = jwtUtil;
    }

    public User register(User user, String password) {
        userRepo.save(user);
        Credential cred = new Credential();
        cred.setUser(user);
        cred.setPasswordHash(encoder.encode(password));
        cred.setRole("USER");
        credRepo.save(cred);
        return user;
    }

    public String login(String email, String password) {
        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) throw new RuntimeException("User not found");
        Credential cred = credRepo.findByUserEmail(email).orElseThrow();
        if (!encoder.matches(password, cred.getPasswordHash()))
            throw new RuntimeException("Invalid credentials");
        return jwtUtil.generateToken(email);
    }
    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    public User getUserById(Long id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

}

