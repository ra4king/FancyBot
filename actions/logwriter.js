module.exports = {
    init: init
};

function init(action, utils, config) {
    action({name: '_msg'}, function(bot, from, to, text, message, utils, config) {
        if(to !== bot.nick && text[0] !== '-') {
            writeToLog(to, '<' + from + '> ' + text);
        }
    });

    action({name: '_notice'}, function(bot, from, to, text, message, utils, config) {
        if(to === bot.channel) {
            from = from == null ? 'Server' : from;
            writeToLog(to, '-' + from + '- ' + text);
        }
    });

    action({name: '_self'}, function(bot, to, text, utils, config) {
        if(to === bot.channel) {
            if(text.startsWith('\x01ACTION')) {
                writeToLog(to, '* ' + bot.nick + text.substring(7, text.length - 1));
            } else {
                writeToLog(to, '<' + bot.nick + '> ' + text);
            }
        }
    });

    action({name: '_action'}, function(bot, from, to, text, message, utils, config) {
        if(to !== bot.nick) {
            writeToLog(to, '* ' + from + ' ' + text);
        }
    });

    action({name: '_mode'}, function(bot, channel, by, mode, argument, message, utils, config) {
        writeToLog(channel, '*** ' + by + ' sets mode: ' + mode + ' ' + argument);
    });

    action({name: '_join'}, function(bot, channel, nick, message) {
        writeToLog(channel, '*** ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') has joined ' + channel);
    });

    action({name: '_quit'}, function(bot, channel, nick, reason, message) {
        writeToLog(channel, '*** ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') has left ' + channel + ' (' + reason + ')');
    });

    action({name: '_part'}, function(bot, channel, nick, reason, message) {
        writeToLog(channel, '*** ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') has left ' + channel + ' (' + reason + ')');
    });

    action({name: '_kick'}, function(bot, channel, nick, by, reason, message) {
        writeToLog(channel, '*** ' + by + ' has kicked ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') from ' + channel + ' (' + reason + ')');
    });

    action({name: '_nick'}, function(bot, oldnick, newnick, channels, message) {
        writeToLog(channels[0], '*** ' + oldnick + ' is now known as ' + newnick);
    });
}

var save_log_count = 0;
var last_log_timeout = null;
var log_buffer = [];

var fs = require('fs');

function writeToLog(channel, text) {
    if(!channel) return;

    log_buffer.push([new Date(), text]);

    if(save_log_count < 10) {
        if(last_log_timeout) {
            clearTimeout(last_log_timeout);
            save_log_count++;
        }

        last_log_timeout = setTimeout(function() {
            save_log_count = 0;
            last_log_timeout = null;

            function append_log(date, data) {
                function left_pad(s) {
                    return (s < 10 ? '0' : '') + s;
                }

                var filename = 'logs/' + channel + '.' + date.getUTCFullYear() + '-' + left_pad(date.getUTCMonth()+1) + '-' + left_pad(date.getUTCDate()) + '.log';
                fs.appendFile(filename, data);
            }

            var data = '';
            var last_date = null;
            log_buffer.forEach(function(s, idx) {
                var date = s[0];

                if(last_date != null && date.getUTCDate() != last_date.getUTCDate()) {
                    append_log(date, data);
                    data = '';
                }

                last_date = date;
                data += '[' + date.toUTCString() + ']  ' + s[1] + '\n';
            });

            append_log(last_date, data);

            log_buffer = [];
        }, 1000);
    }
}
