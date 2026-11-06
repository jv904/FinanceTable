package com.com.financeTable.backend.auth.dto;

import com.com.financeTable.backend.user.User;

public record UserResponse(String name, String email) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getName(), user.getEmail());
	}

}
