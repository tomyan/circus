
var litmus = require('litmus');

module.exports = new litmus.Suite('circus test suite', [
    require('./basic')
]);

