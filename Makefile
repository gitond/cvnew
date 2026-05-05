CV_CONFIG ?= texcv/configs/default.json

.PHONY: validate cv site

validate:
	npm run validate

cv: validate
	node texcv/build.js --config $(CV_CONFIG)
	cd texcv && pdflatex -interaction=nonstopmode cv.tex

site: validate
	@echo "site pipeline not yet implemented"
