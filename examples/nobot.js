
var circus = require('../lib/circus');

var channel = process.argv[2];
if (! channel) {
    console.log('channel reqired');
    process.exit(1);
}
channel = '#' + channel;

var client = new circus.Client;

client.connect('nobot', 'irc.freenode.net', { debug: true }).then(function (connection) {

    connection.onMessage(function (message, agent) {
        agent.sendMessage('no');
    });

    connection.join(channel).then(function (channel) {
        channel.onMessage(function (message, agent) {
            if (message = connection.messageAddressedToMe(message)) {
                channel.sendMessage(agent.nick + ': no');
            }
        });
    });

});

