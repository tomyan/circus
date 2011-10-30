Circus is a prototype IRC client library. The API looks like:

    var circus = require('circus');
    
    var client = new circus.Client();
    
    client.connect('botsnick', 'irc.freenode.net', { nickServPassword: 'botspassword' }).then(function (connection) {
        
        connection.signals.messaged.add(function (message, agent) {
            agent.sendMessage('hi ' + agent.nick);
        });
        
        connection.join('#achannel').then(function (channel) {
            channel.signals.messaged.add(function (message, agent, channel) {
                // convenience to match and strip the nick
                if (message = connection.messageAddressedToMe(message)) {
                    channel.sendMessage('hi ' + agent.nick + ' (you said ' + message + ')');
                }
            });
        });
        
    });

It's not anywhere useful yet - not sure if I'm going to continue to develop it or use something else.

Copyright (C) 2011 by <a href="http://use.no.de/contact#contributors">UseNode contributors</a> (see <a href="https://github.com/usenode/litmus/commits/master">contributions</a>).

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

