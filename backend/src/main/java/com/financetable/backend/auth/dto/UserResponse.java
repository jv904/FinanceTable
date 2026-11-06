package com.financetable.backend.auth.dto;

import com.financetable.backend.user.User;

public record UserResponse(String name, String email) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getName(), user.getEmail());
	}

}
