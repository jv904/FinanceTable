package com.financetable.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String frontendUrl, String mailFrom, Duration passwordResetValidity, Limits limits) {

	public record Limit(int max, Duration window) {
	}

	public record Limits(Limit loginAccount, Limit loginIp, Limit passwordChange, Limit passwordResetIp,
			Limit registerIp, Limit forgotEmail, Limit forgotIp) {
	}

}
