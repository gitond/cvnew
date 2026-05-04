.PHONY: validate cv site

validate:
	npm run validate

cv: validate
	@echo "cv pipeline not yet implemented"

site: validate
	@echo "site pipeline not yet implemented"
