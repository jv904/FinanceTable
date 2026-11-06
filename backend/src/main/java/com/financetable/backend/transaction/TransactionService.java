package com.financetable.backend.transaction;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.financetable.backend.category.Category;
import com.financetable.backend.category.CategoryService;
import com.financetable.backend.common.ApiException;
import com.financetable.backend.transaction.dto.TransactionPageResponse;
import com.financetable.backend.transaction.dto.TransactionRequest;
import com.financetable.backend.transaction.dto.TransactionResponse;

/** Devolve DTOs, e não entidades: a categoria é preguiçosa e só pode ser lida dentro da transação. */
@Service
class TransactionService {

	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort NEWEST_FIRST = Sort.<Transaction>by(Sort.Direction.DESC, Transaction::getOccurredOn,
			Transaction::getCreatedAt, Transaction::getId);

	private final TransactionRepository transactions;
	private final CategoryService categories;

	TransactionService(TransactionRepository transactions, CategoryService categories) {
		this.transactions = transactions;
		this.categories = categories;
	}

	@Transactional(readOnly = true)
	TransactionPageResponse list(UUID userId, TransactionFilter filter, int page, int size) {
		if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "A data inicial não pode ser posterior à data final.");
		}
		PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), NEWEST_FIRST);
		Page<Transaction> result = transactions.findAll(filter.toSpecification(userId), pageRequest);
		return new TransactionPageResponse(result.map(TransactionResponse::from).getContent(), result.getNumber(),
				result.getSize(), result.getTotalElements(), result.getTotalPages());
	}

	@Transactional
	TransactionResponse create(UUID userId, TransactionRequest request) {
		Transaction transaction = new Transaction(userId, compatibleCategory(userId, request), request.description(),
				request.amount(), request.occurredOn());
		return TransactionResponse.from(transactions.saveAndFlush(transaction));
	}

	@Transactional
	TransactionResponse update(UUID userId, UUID id, TransactionRequest request) {
		Transaction transaction = find(userId, id);
		transaction.update(compatibleCategory(userId, request), request.description(), request.amount(),
				request.occurredOn());
		return TransactionResponse.from(transaction);
	}

	@Transactional
	void delete(UUID userId, UUID id) {
		transactions.delete(find(userId, id));
	}

	/** Movimentação de outra conta responde como inexistente, para não revelar que ela existe. */
	private Transaction find(UUID userId, UUID id) {
		return transactions.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Movimentação não encontrada."));
	}

	private Category compatibleCategory(UUID userId, TransactionRequest request) {
		Category category = categories.findOwned(userId, request.categoryId());
		if (category.getType() != request.type()) {
			throw new ApiException(HttpStatus.BAD_REQUEST,
					"A categoria escolhida não é compatível com o tipo da movimentação.");
		}
		return category;
	}

}
