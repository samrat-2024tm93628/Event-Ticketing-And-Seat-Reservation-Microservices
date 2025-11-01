package com.event.userservice.entity;



import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "credentials")
public class Credential {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long credentialId;

    public Long getCredentialId() {
		return credentialId;
	}
	public void setCredentialId(Long credentialId) {
		this.credentialId = credentialId;
	}
	public User getUser() {
		return user;
	}
	public void setUser(User user) {
		this.user = user;
	}
	public String getPasswordHash() {
		return passwordHash;
	}
	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}
	public String getRole() {
		return role;
	}
	public void setRole(String role) {
		this.role = role;
	}
	public LocalDateTime getCreatedAt() {
		return createdAt;
	}
	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
	@OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String passwordHash;
    private String role;
    private LocalDateTime createdAt = LocalDateTime.now();
}

