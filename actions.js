module.exports = {
    'help': help,
    'ping': ping,
    'notify': notify,
    'calc': calc,
    'exec': exec,
    'notitle': no_title,
    'lastseen': last_seen,
    'convert': convert,
    'eightball': eightball,
    '8ball': eightball,
    '_': no_command,
    '_init': _init,
    '_msg': _msg,
    '_self': _self,
    '_action': _action,
    '_mode': _mode,
    '_nick': _nick,
    '_join': _join,
    '_part': _part,
    '_kick': _kick
};

var fs = require('fs');

var config;
load_config();

function load_config() {
    try {
        config = JSON.parse(fs.readFileSync('config.json'));
        console.log('Loaded config');
    } catch(e) {
        console.error('ERROR: COULD NOT LOAD CONFIG');
        config = {};
    }
}

var save_config_count = 0;
var last_config_timeout = null;
function save_config() {
    if(save_config_count < 10) {
        if(last_config_timeout) {
            clearTimeout(last_config_timeout);
            save_config_count++;
        }

        last_config_timeout = setTimeout(function() {
            save_config_count = 0;
            last_config_timeout = null;
            fs.writeFile('config.json', JSON.stringify(config, null, 4), function(err) {
                if(err)
                    console.error('ERROR: COULD NOT WRITE CONFIG!');
            });
        }, 1000);
    }
}

function handle_notify(bot, from, to, text, message) {
    if(config.notify_messages && config.notify_messages[from]) {
        var nick;
        config.notify_messages[from].forEach(function(val) {
            if(!nick) {
                nick = val;
            } else {
                sayDirect(bot, from, to, nick + ' says: ' + val);
            }
        });

        delete config.notify_messages[from];
    }
}

function handle_last_seen(bot, from, to, text, message) {
    if(to !== bot.nick) {
        if(!config.last_seen) {
            config.last_seen = {};
        }

        config.last_seen[from] = [Date.now(), text];
        save_config();
    }
}

function last_seen(bot, from, to, text, message) {
    if(!text) {
        sayDirect(bot, from, to, 'Usage: !lastseen nick');
        return;
    }

    if(config.last_seen && config.last_seen[text]) {
        var last_time = config.last_seen[text][0];
        var last_msg = config.last_seen[text][1];

        var d = Date.now() - last_time;
        var s = '';
        [[1000,60,'second'], [60,60,'minute'], [60,24,'hour'], [24,365,'day'], [365,0,'year']].forEach(function(func, idx) {
             d = Math.floor(d / func[0]);
             var r = func[1] == 0 ? d : d % func[1];

            if(r > 0) {
                s = ' ' + r + ' ' + func[2] + (r > 1 ? 's' : '') + s;
            }
        });

        if(s) {
            sayDirect(bot, from, to, text + ' last seen' + s + ' ago: ' + last_msg);
        } else {
            sayDirect(bot, from, to, text + ' was just seen');
        }
    } else {
        sayDirect(bot, from, to, 'I have not seen ' + text);
    }
}

function help(bot, from, to, text, message) {
    var commands = '';
    for(c in module.exports) {
        if(c[0] !== '_') {
            commands += ' ' + c;
        }
    }
    sayDirect(bot, from, to, 'Available commands:' + commands);
}

function ping(bot, from, to, text, message) {
    sayDirect(bot, from, to, 'pong');
}

function notify(bot, from, to, text, message) {
    var idx = text.indexOf(' ');
    if(!text || idx == -1) {
        sayDirect(bot, from, to, 'Usage: !notify nick message');
        return;
    }

    var nick = text.substring(0, idx).trim();
    var msg = text.substring(idx + 1).trim();

    if(!config.notify_messages) {
        config.notify_messages = {};
    }

    if(config.notify_messages[nick]) {
        config.notify_messages[nick].push(msg);
    } else {
        config.notify_messages[nick] = [from, msg];
    }

    save_config();

    sayDirect(bot, from, to, 'Ok');
}

function calc(bot, from, to, text, message) {
    exec(bot, from, to, text, message, true);
}

function exec(bot, from, to, text, message, is_calc) {
    // if(!is_calc && to !== bot.nick && bot.chans[to].users[from] !== '@') {
    //     sayDirect(bot, from, to, 'Only ops may use this command.');
    //     return;
    // }

    if(!text) {
        if(is_calc) {
            sayDirect(bot, from, to, 'Usage: !calc 4 + 5');
        } else {
            sayDirect(bot, from, to, 'Usage: !exec print("Hello, world!")');
        }
        return;
    }

    if(is_calc) {
        if(text.indexOf(';') != -1) {
            return;
        }

        text = 'print(' + text + ')';
    }

    console.log('exec: ' + text);

    try {
        var output = '';
        var context = {
            'print': function(text) {
                output += text.toString() + ' ';
            },
            'Promise': undefined
        };

        context.print.toString = function() {
            throw new Error('cannot print a function');
        }

        require('vm').runInNewContext(text, context, { 'timeout': 1000 });

        if(output.length > 255) {
            sayDirect(bot, from, to, 'Too much output');
        } else if(!output) {
            sayDirect(bot, from, to, 'No output');
        } else {
            sayDirect(bot, from, to, output.replace(/\n/g, ' ').replace(/ +/, ' '));
        }
    } catch(e) {
        sayDirect(bot, from, to, 'Error: ' + e.message);
    }
}

var units;
var units_regex;
init_units();

function init_units() {
    var inches = /inch(?:es)?/;
    var yards = /yards?/;
    var feet = /f(?:ee|oo)t/;
    var miles = /miles?/
    var millimeters = /millimet(?:er|re)s?|mm/;
    var centimeters = /centimet(?:er|re)s?|cm/;
    var decimeters = /decimet(?:er|re)s?|dm/;
    var meters = /met(?:er|re)s?|m/;
    var kilometers = /kilomet(?:er|re)s?|km/;
    var celsius = /celsius|c/;
    var fahrenheit = /fahrenheit|f/;
    var kelvin = /kelvin|k/;

    var regex = /(-?\d+(\.\d+)?) ?/;

    function toString(rgx) {
        var s = rgx.toString();
        return s.substring(1, s.length - 1);
    }

    var unitsRegex = '(' + toString(inches);
    [yards, feet, miles, millimeters, centimeters, decimeters, meters, kilometers, celsius, fahrenheit, kelvin].forEach(function(t) {
        unitsRegex += '|' + toString(t);
    })
    unitsRegex += ')';

    units_regex = new RegExp(toString(regex) + unitsRegex + ' to ' + unitsRegex);

    units = {};

    units[feet] = {};
    {
        units[feet][inches] = 12.0;
        units[feet][yards] = 3.0;
        units[feet][miles] = 1.0/5280.0;
        units[feet][meters] = 0.3048;
    }

    units[meters] = {};
    {
        units[meters][millimeters] = 1000.0;
        units[meters][centimeters] = 100.0;
        units[meters][decimeters] = 10.0;
        units[meters][kilometers] = 0.001;
        units[meters][feet] = 3.28084;
    }

    units[celsius] = {};
    {
        units[celsius][fahrenheit] = function(val, reverse) {
            if(reverse) {
                return (val - 32.0) * 5.0 / 9.0;
            } else {
                return (val * 9.0 / 5.0) + 32.0;
            }
        };
        units[celsius][kelvin] = function(val, reverse) {
            if(reverse) {
                return val - 273.15;
            } else {
                return val + 273.15;
            }
        };
    }
}

function convert(bot, from, to, text, message, notify_fail) {
    if(!text) {
        sayDirect(bot, from, to, 'Usage: !convert 45 feet to meters');
        return;
    }

    var result = new RegExp(units_regex).exec(text);
    if(!result) {
        sayDirect(bot, from, to, 'Incorrect conversion request');
        return;
    }

    var value = Number(result[1]);
    var convertFrom = result[3];
    var convertTo = result[4];

    console.log(value + ' ' + convertFrom + ' to ' + convertTo);

    var foundFrom = null;
    var foundFromBase = null;
    var foundToBase = null;
    var foundTo = null;

    function toString(rgx) {
        if(!rgx) return null;
        var s = rgx.toString();
        return '^(?:' + s.substring(1, s.length - 1) + ')$';
    }

    function foundAll() {
        return foundFrom && foundFromBase && foundToBase && foundTo;
    }

    for(var t in units) {
        var r = new RegExp(toString(t));

        if(r.test(convertFrom)) {
            foundFrom = t;
            foundFromBase = t;
        }
        if(r.test(convertTo)) {
            foundTo = t;
            foundToBase = t;
        }

        for(var t2 in units[t]) {
            r = new RegExp(toString(t2));

            if(!foundFrom && r.test(convertFrom)) {
                foundFrom = t2;
                foundFromBase = t;
            }
            if(!foundTo && r.test(convertTo)) {
                foundTo = t2;
                foundToBase = t;
            }
        }
    }

    console.log(toString(foundFrom) + ' ' + toString(foundFromBase) + ' ' + toString(foundToBase) + ' ' + toString(foundTo));

    function unsupported() {
        sayDirect(bot, from, to, 'Unsupported conversion');
    }

    if(!foundAll()) {
        unsupported();
        return;
    }

    function apply(value, factor, reversed) {
        if(typeof factor === 'function') {
            return factor(value, reversed);
        } else if(reversed) {
            console.log('applying 1/' + factor + ' to ' + value);
            return value / factor;
        } else {
            console.log('applying ' + factor + ' to ' + value);
            return value * factor;
        }
    }

    var converted = value;
    if(foundFrom !== foundFromBase) {
        var factor = units[foundFromBase][foundFrom];
        converted = apply(converted, factor, true);
    }

    if(foundFromBase !== foundToBase) {
        var factor = units[foundFromBase][foundToBase];
        if(!factor) {
            unsupported();
            return;
        }
        converted = apply(converted, factor, false);
    }

    if(foundToBase !== foundTo) {
        var factor = units[foundToBase][foundTo];
        converted = apply(converted, factor, false);
    }

    sayDirect(bot, from, to, value + ' ' + convertFrom + ' = ' + converted + ' ' + convertTo);
}

function no_title(bot, from, to, text, message) {
    if(to === bot.nick || !bot.chans[to] || bot.chans[to].users[from] !== '@') {
        sayDirect(bot, from, to, 'Only ops may use this command.');
        return;
    }

    if(!text) {
        sayDirect(bot, from, to, 'Usage: !notitle a.domain.com');
        return;
    }

    var url_regex = /^(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?$/g;
    var result = url_regex.exec(text);
    if(!result) {
        sayDirect(bot, from, to, 'Not a URL');
        return;
    }

    var url = result[0];
    if(result[1] === undefined) {
        url = 'http://' + url;
    }
    var parsed_url = require('url').parse(url);

    if(config.url_blacklist) {
        config.url_blacklist.push(parsed_url.hostname.toLowerCase());
    } else {
        config.url_blacklist = [parsed_url.hostname.toLowerCase()];
    }

    sayDirect(bot, from, to, 'Ok');
}

function eightball(bot, from, to, text, message) {
    var options = ['It is certain', 'It is decidedly so', 'Without a doubt', 'Yes, definitely', 'You may rely on it',
                   'As I see it, yes', 'Most likely', 'Outlook good', 'Yes', 'Signs point to yes', 'Reply hazy try again',
                   'Ask again later', 'Better not tell you now', 'Cannot predict now', 'Concentrate and ask again',
                   'Don\'t count on it', 'My reply is no', 'My sources say no', 'Outlook not so good', 'Very doubtful'];

    var choice = Math.floor(Math.random() * options.length);
    sayDirect(bot, from, to, options[choice]);
}

function no_command(bot, from, to, text, message) {
    var url_regex = /(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?/g;

    var result;
    while((result = url_regex.exec(text)) != null) {
        console.log('Detected URL: ' + result[0]);

        var url_result = result[0];

        if(result[1] === undefined) {
            url_result = 'http://' + url_result;
        }

        function get_title(url) {
            console.log('Retrieving title for ' + url);

            try {
                var parsed_url = require('url').parse(url);

                if(config.url_blacklist) {
                    var lc_url = parsed_url.hostname.toLowerCase();

                    if(config.url_blacklist.findIndex(function(value) {
                        return value === lc_url;
                    }) != -1) {
                        console.log('Matched blacklist entry.');
                        return;
                    }
                }

                var protocol = parsed_url.protocol === 'https:' ? require('https') : require('http');

                protocol.get(parsed_url, function(response) {
                    if(response.statusCode == 200) {
                        var data = '';
                        response.on('data', function(chunk) {
                            data += chunk.toString();
                        });
                        response.on('end', function() {
                            var title_regex = /<\s*title.*?>([\s\S]+?)</mi;
                            var title = title_regex.exec(data);

                            if(title && title[1]) {
                                title[1] = title[1].replace(/\r|\n/g, ' ');

                                console.log('URL Title: ' + title[1]);
                                bot.say(to === bot.nick ? from : to, title[1] + ' - ' + parsed_url.protocol + '//' + parsed_url.hostname);
                            } else {
                                console.log('No title found.');
                            }
                        });
                    } else if(Math.floor(response.statusCode / 100) == 3) {
                        console.log('Got redirect (' + response.statusCode + ') for ' + url);
                        var r = /^(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?$/;
                        if(response.headers.location && r.test(response.headers.location)) {
                            get_title(response.headers.location);
                        } else {
                            console.log('Did not receive valid redirect for ' + url + ': ' + response.headers.location);
                        }
                    } else {
                        console.log('Got status ' + response.statusCode + ' for ' + url);
                    }
                }).on('error', function(err) {
                    console.log('Could not reach ' + url + ': ' + err.message);
                });
            } catch(e) {
                console.log('Could not parse ' + url);
            }
        };

        get_title(url_result);
    }
}

function _msg(bot, from, to, text, message) {
    handle_notify(bot, from, to, text, message);

    if(to !== bot.nick) {
        handle_last_seen(bot, from, to, text, message);
        writeToLog(to, '<' + from + '> ' + text);
    }
}

function _self(bot, to, text) {
    if(to === bot.channel) {
        writeToLog(to, '<' + bot.nick + '> ' + text);
    }
}

function _action(bot, from, to, text, message) {
    handle_notify(bot, from, to, text, message);

    if(to !== bot.nick) {
        handle_last_seen(bot, from, to, text, message);

        writeToLog(to, '* ' + from + ' ' + text);
    }
}

function _mode(bot, channel, by, mode, argument, message) {
    writeToLog(channel, '*** ' + by + ' sets mode: ' + mode + ' ' + argument);
}

function _init(bot, channel, message) {
    console.log('Joined ' + channel);
}

function _join(bot, channel, nick, message) {
    handle_notify(bot, nick, channel, '[joined ' + channel + ']', message);
    handle_last_seen(bot, nick, channel, '[joined ' + channel + ']', message);
    writeToLog(channel, '*** ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') has joined ' + channel);
}

function _part(bot, channel, nick, reason, message) {
    writeToLog(channel, '*** ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') has left ' + channel + ' (' + reason + ')');
}

function _kick(bot, channel, nick, by, reason, message) {
    writeToLog(channel, '*** ' + by + ' has kicked ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') from ' + channel + ' (' + reason + ')');
}

function _nick(bot, oldnick, newnick, channels, message) {
    writeToLog(channels[0], '*** ' + oldnick + ' is now known as ' + newnick);
}

function sayDirect(bot, from, to, message) {
    if(to === bot.nick) {
        bot.say(from, message);
    } else {
        bot.say(to, from + ': ' + message);
    }
}

var save_log_count = 0;
var last_log_timeout = null;
var log_buffer = [];

function writeToLog(channel, text) {
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
