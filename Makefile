# Aliases for humans. The real interface is bin/vawe (`bin/vawe --help`); each target here forwards to it.
# Usage: make dev PAGE=films/<name>/page.html [ARGS="--from 2 --to 6"]

.DEFAULT_GOAL := help
.PHONY: dev ship critique spec studio e2e test install-hooks help

dev:      ; @bin/vawe dev $(PAGE) $(ARGS)
ship:     ; @bin/vawe ship $(PAGE) $(ARGS)
critique: ; @bin/vawe critique $(PAGE) $(ARGS)
spec:     ; @bin/vawe spec $(REF) $(ARGS)
studio:   ; @bin/vawe studio $(PAGE) $(ARGS)
e2e:      ; @bin/vawe e2e
test:     ; @bin/vawe test

install-hooks:
	git config core.hooksPath .githooks
	@echo "hooks active: pre-commit (fast checks), pre-push (fast checks + e2e), commit-msg, post-checkout"

help:     ; @bin/vawe --help
