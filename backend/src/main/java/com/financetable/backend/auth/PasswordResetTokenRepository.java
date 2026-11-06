package com.financetable.backend.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

	/** Com bloqueio, para que duas requisições simultâneas não usem o mesmo link. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	Optional<PasswordResetToken> findByTokenHash(String tokenHash);

	@Modifying
	@Query("update PasswordResetToken t set t.usedAt = :now where t.userId = :userId and t.usedAt is null")
	void invalidateAllForUser(UUID userId, Instant now);

}
