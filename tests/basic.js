
var litmus = require('litmus'),
    circus = require('..');

module.exports = new litmus.Test('basic functionality', function () {
    var test = this;

    test.plan(1); 

    test.is(typeof circus, 'object', 'namespace is an object');
});

