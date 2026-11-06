package com.com.financeTable.backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.com.financeTable.backend.mail.MailService;

/**
 * Processa o pedido fora da requisição: a resposta leva o mesmo tempo com o e-mail cadastrado ou
 * não, então o tempo de resposta não revela quais e-mails existem.
 */
@Component
class PasswordResetRequestHandler {

	private static final Logger log = LoggerFactory.getLogger(PasswordResetRequestHandler.class);

	private final PasswordResetService resetService;
	private final MailService mailService;

	PasswordResetRequestHandler(PasswordResetService resetService, MailService mailService) {
		this.resetService = resetService;
		this.mailService = mailService;
	}

	@Async
	public void handle(String email) {
		try {
			resetService.issue(email).ifPresent(issued -> mailService.sendPasswordReset(issued.recipientName(),
					issued.recipientEmail(), issued.rawToken()));
		}
		catch (RuntimeException ex) {
			log.error("Falha ao enviar o e-mail de recuperação de senha", ex);
		}
	}

}
