DirectSupToDirect.min.js: DirectSupToDirect.js
	echo 'javascript:$(shell uglifyjs $<)' > $@
