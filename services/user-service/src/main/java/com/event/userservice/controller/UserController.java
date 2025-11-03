package com.event.userservice.controller;


import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.event.userservice.entity.User;
import com.event.userservice.service.UserService;

@RestController
@RequestMapping("/v1/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public User register(@RequestBody Map<String, String> req) {
        User user = new User();
        user.setName(req.get("name"));
        user.setEmail(req.get("email"));
        user.setPhone(req.get("phone"));
        return service.register(user, req.get("password"));
    }

    @PostMapping("/login")
    public String login(@RequestBody Map<String, String> req) {
        return service.login(req.get("email"), req.get("password"));
    }
    @GetMapping
    public List<User> getAllUsers() {
        return service.getAllUsers();
    }
    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return service.getUserById(id);
    }


}
