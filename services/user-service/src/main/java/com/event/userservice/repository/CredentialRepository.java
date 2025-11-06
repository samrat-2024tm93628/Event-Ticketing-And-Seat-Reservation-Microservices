package com.event.userservice.repository;


import com.event.userservice.entity.Credential;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CredentialRepository extends JpaRepository<Credential, Long> {
    Optional<Credential> findByUserEmail(String email);
}
