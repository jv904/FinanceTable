package com.com.financeTable.backend.mail;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.com.financeTable.backend.config.AppProperties;

@Service
public class MailService {

	private final JavaMailSender mailSender;
	private final AppProperties properties;

	MailService(JavaMailSender mailSender, AppProperties properties) {
		this.mailSender = mailSender;
		this.properties = properties;
	}

	public void sendPasswordReset(String name, String email, String rawToken) {
		String link = UriComponentsBuilder.fromUriString(properties.frontendUrl())
				.path("/redefinir-senha")
				.queryParam("token", rawToken)
				.build()
				.toUriString();

		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(properties.mailFrom());
		message.setTo(email);
		message.setSubject("FinanceTable: redefinição de senha");
		message.setText("""
				Olá, %s!

				Recebemos um pedido para redefinir a senha da sua conta no FinanceTable.
				Para criar uma nova senha, acesse o link abaixo. Ele vale por %d minutos e só pode ser usado uma vez:

				%s

				Se não foi você, ignore este e-mail. Sua senha continuará a mesma.
				""".formatted(name, properties.passwordResetValidity().toMinutes(), link));
		mailSender.send(message);
	}

}
