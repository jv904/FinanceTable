package com.financetable.backend.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serve o Angular empacotado em {@code static/}. As rotas são do Angular, então recarregar
 * {@code /relatorios} precisa devolver o {@code index.html}. A API e arquivos que não existem
 * continuam com 404.
 */
@Configuration
class SpaConfig implements WebMvcConfigurer {

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/**")
				.addResourceLocations("classpath:/static/")
				.resourceChain(true)
				.addResolver(new SpaResourceResolver());
	}

	private static final class SpaResourceResolver extends PathResourceResolver {

		@Override
		protected Resource getResource(String path, Resource location) throws IOException {
			Resource resource = super.getResource(path, location);
			if (resource != null || isNotAnAngularRoute(path)) {
				return resource;
			}
			return super.getResource("index.html", location);
		}

		private static boolean isNotAnAngularRoute(String path) {
			return path.equals("api") || path.startsWith("api/") || path.startsWith("actuator/") || path.contains(".");
		}

	}

}
