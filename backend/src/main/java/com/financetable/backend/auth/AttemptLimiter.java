package com.financetable.backend.auth;

import java.util.EnumMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.financetable.backend.common.ApiException;
import com.financetable.backend.config.AppProperties;
import com.financetable.backend.config.AppProperties.Limit;
import com.financetable.backend.config.AppProperties.Limits;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

/**
 * Conta tentativas em memória. Os contadores zeram ao reiniciar e valem para uma instância só; com
 * várias instâncias, será preciso guardá-los no banco. O prazo recomeça a cada tentativa contada, e
 * uma tentativa recusada não é contada.
 */
@Component
class AttemptLimiter {

	enum Rule {
		LOGIN_ACCOUNT, LOGIN_IP, PASSWORD_CHANGE, PASSWORD_RESET_IP, REGISTER_IP, FORGOT_EMAIL, FORGOT_IP
	}

	private static final String TOO_MANY = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
	/** Limita a memória mesmo com uma enxurrada de e-mails ou endereços diferentes. */
	private static final int MAX_KEYS = 100_000;

	private final Map<Rule, Limit> limits = new EnumMap<>(Rule.class);
	private final Map<Rule, Cache<String, Integer>> counters = new EnumMap<>(Rule.class);

	AttemptLimiter(AppProperties properties) {
		Limits configured = properties.limits();
		limits.put(Rule.LOGIN_ACCOUNT, configured.loginAccount());
		limits.put(Rule.LOGIN_IP, configured.loginIp());
		limits.put(Rule.PASSWORD_CHANGE, configured.passwordChange());
		limits.put(Rule.PASSWORD_RESET_IP, configured.passwordResetIp());
		limits.put(Rule.REGISTER_IP, configured.registerIp());
		limits.put(Rule.FORGOT_EMAIL, configured.forgotEmail());
		limits.put(Rule.FORGOT_IP, configured.forgotIp());
		limits.forEach((rule, limit) -> counters.put(rule,
				Caffeine.newBuilder().maximumSize(MAX_KEYS).expireAfterWrite(limit.window()).build()));
	}

	/** Recusa a ação se o limite já foi atingido, sem contar esta tentativa. */
	void requireAllowed(Rule rule, String key) {
		if (isBlocked(rule, key)) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, TOO_MANY);
		}
	}

	/** Recusa a ação se o limite já foi atingido; se não, conta esta tentativa. */
	void consume(Rule rule, String key) {
		requireAllowed(rule, key);
		record(rule, key);
	}

	/** Conta a tentativa e diz se ela está dentro do limite, para quem precisa recusar em silêncio. */
	boolean tryConsume(Rule rule, String key) {
		if (isBlocked(rule, key)) {
			return false;
		}
		record(rule, key);
		return true;
	}

	void record(Rule rule, String key) {
		counters.get(rule).asMap().merge(key, 1, Integer::sum);
	}

	void clear(Rule rule, String key) {
		counters.get(rule).invalidate(key);
	}

	private boolean isBlocked(Rule rule, String key) {
		Integer attempts = counters.get(rule).getIfPresent(key);
		return attempts != null && attempts >= limits.get(rule).max();
	}

}
