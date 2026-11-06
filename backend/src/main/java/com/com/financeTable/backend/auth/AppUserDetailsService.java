package com.com.financeTable.backend.auth;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.com.financeTable.backend.user.User;
import com.com.financeTable.backend.user.UserRepository;

/**
 * Procura o usuário pelo e-mail, mas identifica a sessão pelo id: o nome do principal é o UUID do
 * usuário. Assim, a sessão não guarda dados pessoais e continua válida se o e-mail mudar.
 */
@Service
class AppUserDetailsService implements UserDetailsService {

	private final UserRepository users;

	AppUserDetailsService(UserRepository users) {
		this.users = users;
	}

	@Override
	public UserDetails loadUserByUsername(String email) {
		User user = users.findByEmail(EmailNormalizer.normalize(email))
				.orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
		return org.springframework.security.core.userdetails.User
				.withUsername(user.getId().toString())
				.password(user.getPasswordHash())
				.authorities("ROLE_USER")
				.build();
	}

}
