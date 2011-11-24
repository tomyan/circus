
test: node_modules/.bin/litmus
	$< tests/suite.js

node_modules/.bin/litmus:
	npm install litmus


