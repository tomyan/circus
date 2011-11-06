
var net     = require('net'),
    promise = require('promised-io/promise'),
    on      = require('on');

var Channel = function (name, connection) {
    this.name = name;
    this.connection = connection;
    this.connection.sendJoin(name);
    this.onMessage = on(this);
    this.joined = new promise.Promise;
};

Channel.prototype.sendMessage = function (message) {
    this.connection.sendPrivMsg(this.name, message);
};

Channel.prototype.handleMessage = function (message, agent) {
    this.onMessage._fire(message, agent);
};

function bind (func, to) {
    return function () {
        func.apply(to, arguments);
    };
}

var Agent = function (nick, user, hostname, connection) {
    this.nick       = nick;
    this.user       = user;
    this.hostname   = hostname;
    this.connection = connection;
};

Agent.prototype.toString = function () {
    return this.nick + '!' + this.user + '@' + this.hostname;
};

Agent.prototype.sendMessage = function (message) {
    this.connection.sendPrivMsg(this.nick, message);
};

var Connection = function (nick, hostname, options) {
    if (! options) {
        options = {};
    }
    if (! options.port) {
        options.port = 6667;
    }
    this._nick     = nick;
    this._hostname = hostname;
    this._options  = options;
    this._channels = {};
    this._socket   = net.createConnection(options.port, hostname);
    this._socket.setEncoding('utf8');
    this._socket.addListener('connect', bind(this._onConnect, this));
    this._socket.addListener('data', bind(this._onData, this));
    this.onMessage = on(this);
    this.connected = new promise.Promise;
    this._buffer = '';
};

Connection.prototype.messageAddressedToMe = function (message) {
    // TODO match on actual nick and alternative nicks
    var matcher = new RegExp('^(?:' + this._nick + ')[:, ]?\\s*(.*)$'),
        match = message.match(matcher);
    if (match) {
        return match[1];
    }
};

Connection.prototype._send = function () {
    var message = Array.prototype.join.call(arguments, ' ');
    if (this._options.debug) {
        console.log('> ' + message);
    }
    this._socket.write(message + '\r\n');
};

Connection.prototype.sendPrivMsg = function (to, message) {
    this._send('PRIVMSG', to, ':' + message);
};

Connection.prototype.sendJoin = function (name) {
    this._send('JOIN', name);
};

Connection.prototype._onConnect = function () {
    this._send('NICK', this._nick);
    this._send('USER', 'guest', 'localhost', 'localhost', ':Guest');
    if (this._options.nickServPassword) {
        this._send('PRIVMSG NickServ :IDENTIFY ' + this._nick + ' ' + this._options.nickServPassword);
    }
    this.connected.resolve(this);
};

Connection.prototype._onData = function (data) {
    this._buffer = this._buffer + data;
    while (true) {
        var match = this._buffer.match(/^(.+?\r\n)([\s\S]*)$/);
        if (match) {
            this._buffer = match[2];
            this.handleMessage(match[1]);
        }
        else {
            break;
        }
    }
};

Connection.prototype._handlePing = function (message) {
    this._send('PONG', message.trailing);
};

Connection.prototype._handleJoin = function (message) {
    var channelName = message.middle[0] || message.trailing, // actually inconsistent within a single network!
        channel     = this._channels[channelName];
    if (message.nick === this._actualNick) {
        if (! channel) {
            throw new Error('JOIN received for unknown channel ' + channelName);
        }
        channel.joined.resolve(channel);
    }
};

Connection.prototype._handlePrivMsg = function (message) {
    // TODO handle caching a validating user objects
    var agent = new Agent(message.nick, message.user, message.hostname, this);
    if (message.middle[0] === this._actualNick) {
        this.onMessage._fire(message.trailing, agent);
    }
    else {
        var channel = this._channels[message.middle[0]];
        if (! channel) {
            throw new Error('received message on unjoined channel: ' + channelName + '(from ' + agent + ')');
        }
        channel.handleMessage(message.trailing, agent);
    }
};

Connection.prototype.join = function (name) {
    var channel = new Channel(name, this);
    this._channels[name] = channel;
    return channel.joined;
};

var Client = exports.Client = function () {
    this.connections = [];
};

Client.prototype.connect = function (nick, hostname, options) {
    var connection = new Connection(nick, hostname, options);
    this.connections.push(connection);
    return connection.connected;
}

var tokens      = {};
tokens.name     = '[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?';
tokens.hostname = tokens.name + '(?:\\.' + tokens.name + ')*';
tokens.nick     = '[a-zA-Z][-a-zA-Z0-9\\[\\]\\\\`^{}]*';
tokens.user     = '\\S+?';
tokens.space    = ' +';
tokens.crlf     = '\\r\\n';
tokens.middle   = '[^: \\r\\n\\0][^ \\r\\n\\0]*';
tokens.trailing = '[^\\r\\n\\0]+';
tokens.command  = '[a-zA-Z]+|\\d{3}';

var matcher = new RegExp(
    // start
    '^' +
    // prefix
    '(?::' +
        '(?:(' + tokens.hostname + ')|(' + tokens.nick + ')(?:!(' + tokens.user + '))?(?:@(' + tokens.hostname + '))?)' + tokens.space +
    ')?' +
    // command
    '(' + tokens.command + ')' +
    // middle(s)
    '(?:' + tokens.space + '(' + tokens.middle + '(?:' + tokens.space + tokens.middle + ')*))?' +
    // trailing (spec says must be present, but freenode does otherwise)
    '(?:' + tokens.space + ':(' + tokens.trailing + '))?' +
    // end
    tokens.crlf + '$'
);

Connection.prototype.handleMessage = function (received) {
    if (this._options.debug) {
        console.log('< ' + received.substr(0, received.length - 2));
    }
    var match = received.match(matcher);
    if (match != null) {
        var message = {
            hostname: match[1] || match[4],
            nick:     match[2],
            user:     match[3],
            command:  match[5],
            middle:   match[6] ? match[6].split(/ +/) : [],
            trailing: match[7]
        };
        switch (message.command) {
            case '001':
                this._actualNick = message.middle[0];
                break;
            case 'PING':
                this._handlePing(message);
                break;
            case 'JOIN':
                this._handleJoin(message)
                break;
            case 'PRIVMSG':
                this._handlePrivMsg(message);
                break;
        }
    }
    else {
        throw new Error('malformed message: ' + received);
    }
};

