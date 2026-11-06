package com.financetable.backend.transaction;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.financetable.backend.category.CategoryType;

/** Planilha no formato que o Excel em português abre direto: BOM, ponto e vírgula e vírgula decimal. */
final class TransactionCsv {

	private static final String BOM = "﻿";
	private static final String SEPARATOR = ";";
	private static final String LINE_END = "\r\n";
	private static final String HEADER = String.join(SEPARATOR, "Data", "Descrição", "Tipo", "Categoria", "Valor");
	private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private TransactionCsv() {
	}

	static byte[] write(List<Transaction> transactions) {
		StringBuilder csv = new StringBuilder(BOM).append(HEADER).append(LINE_END);
		transactions.forEach(transaction -> csv.append(row(transaction)).append(LINE_END));
		return csv.toString().getBytes(StandardCharsets.UTF_8);
	}

	private static String row(Transaction transaction) {
		return String.join(SEPARATOR,
				transaction.getOccurredOn().format(DATE),
				text(transaction.getDescription()),
				transaction.getType() == CategoryType.INCOME ? "Receita" : "Despesa",
				text(transaction.getCategory().getName()),
				transaction.getAmount().toPlainString().replace('.', ','));
	}

	private static String text(String value) {
		String safe = startsLikeFormula(value) ? "'" + value : value;
		return needsQuotes(safe) ? '"' + safe.replace("\"", "\"\"") + '"' : safe;
	}

	/** Sem o apóstrofo, o Excel executaria como fórmula uma descrição digitada como "=HYPERLINK(...)". */
	private static boolean startsLikeFormula(String value) {
		return !value.isEmpty() && "=+-@\t\r".indexOf(value.charAt(0)) >= 0;
	}

	private static boolean needsQuotes(String value) {
		return value.contains(SEPARATOR) || value.contains("\"") || value.contains("\n") || value.contains("\r");
	}

}
