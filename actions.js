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
    var nick = from.toLowerCase();
    if(config.notify_messages && config.notify_messages[nick]) {
        config.notify_messages[nick].forEach(function(val) {
            var ago = val.timestamp ? time_diff(val.timestamp) : '';
            ago = ago ? ago + ' ago' : ' just now';
            var msg = val.nick + ago + ' said: ' + val.msg;

            if(val.pm) {
                bot.say(from, msg);
            }
            else {
                bot.sayDirect(from, to, msg);
            }
        });

        delete config.notify_messages[nick];
    }
}

function handle_last_seen(bot, from, to, text, message) {
    if(to !== bot.nick) {
        if(!config.last_seen) {
            config.last_seen = {};
        }

        config.last_seen[from] = {
            timestamp: Date.now(),
            msg: text
        };

        save_config();
    }
}

function last_seen(bot, from, to, text, message) {
    if(!text) {
        bot.sayDirect(from, to, module.exports['lastseen'].help);
        return;
    }

    if(config.last_seen && config.last_seen[text]) {
        var last_time = config.last_seen[text].timestamp;
        var last_msg = config.last_seen[text].msg;

        var s = time_diff(last_time);

        if(s) {
            bot.sayDirect(from, to, text + ' last seen' + s + ' ago: ' + last_msg);
        } else {
            bot.sayDirect(from, to, text + ' was just seen');
        }
    } else if(text === bot.nick) {
        bot.sayDirect(from, to, 'I have no mirrors with which to see myself :(');
    } else {
        bot.sayDirect(from, to, 'I have not seen ' + text);
    }
}

function ping(bot, from, to, text, message) {
    bot.sayDirect(from, to, 'pong');
}

function slap_msg(bot, from, to, text, message) {
    text = text.trim();
    if(!text) {
        bot.sayDirect(from, to, module.exports['slapmsg'].help);
        return;
    }

    config.slap_messages.push(text);
    save_config();

    bot.sayDirect(from, to, 'Ok.');
}

function slap(bot, from, to, text, message) {
    if(!text) {
        bot.sayDirect(from, to, module.exports['slap'].help);
        return;
    }

    if(to === bot.nick) {
        bot.sayDirect(from, to, 'Can\'t slap anyone in pm!');
        return;
    }

    var idx = text.indexOf(' ');
    var nick = text.substring(0, idx == -1 ? undefined : idx).trim();
    if(bot.chans[to].users[nick] === undefined) {
        bot.sayDirect(from, to, nick + ' is not in this channel.');
        return;
    }

    var message = idx == -1 ? undefined : text.substring(idx).trim();
    if(!message) {
        message = choose_random(config.slap_messages);
    }

    bot.action(to, 'slaps ' + nick + ' ' + message);
}

function notify(bot, from, to, text, message) {
    var idx = text.indexOf(' ');
    if(!text || idx == -1) {
        bot.sayDirect(from, to, module.exports['notify'].help);
        return;
    }

    var notify_nick = text.substring(0, idx).trim().toLowerCase();

    if(notify_nick == bot.nick.toLowerCase()) {
        bot.sayDirect(from, to, 'wat??');
        return;
    }

    var notify = {
        timestamp: Date.now(),
        nick: from,
        msg: text.substring(idx + 1).trim(),
        pm: to === bot.nick
    };

    if(!config.notify_messages) {
        config.notify_messages = {};
    }

    if(config.notify_messages[notify_nick]) {
        config.notify_messages[notify_nick].push(notify);
    } else {
        config.notify_messages[notify_nick] = [notify];
    }

    save_config();

    bot.sayDirect(from, to, 'Ok.');
}

function calc(bot, from, to, text, message) {
    exec(bot, from, to, text, message, true);
}

var exec_context = {}
function exec(bot, from, to, text, message, is_calc) {
    if(!text) {
        if(is_calc) {
            bot.sayDirect(from, to, module.exports['calc'].help);
        } else {
            bot.sayDirect(from, to, module.exports['exec'].help);
        }
        return;
    }

    if(is_calc) {
        console.log('calc: ' + text);

        if(text.indexOf(';') != -1) {
            console.log('Detected semicolon.');
            bot.sayDirect(from, to, 'No statements allowed.');
            return;
        }

        text = 'print(' + text + ')';
    } else {
        console.log('exec: ' + text);
    }

    try {
        var output = '';
        exec_context.print = function(text) {
            output += text + ' ';
        };
        exec_context.print.toString = function() {
            throw new Error('cannot print a function');
        };
        exec_context.Promise = undefined;

        require('vm').runInNewContext(text, exec_context, { 'timeout': 1000 });

        if(output.length > 255) {
            bot.sayDirect(from, to, 'Too much output');
        } else if(!output) {
            bot.sayDirect(from, to, 'No output');
        } else {
            bot.sayDirect(from, to, output.replace(/\n/g, ' ').replace(/ +/, ' '));
        }
    } catch(e) {
        bot.sayDirect(from, to, 'Error: ' + e.message);
    }
}

var units;
var units_regex;
init_units();

function init_units() {
    var inch = /inch(?:es)?/;
    var yard = /yards?/;
    var foot = /f(?:ee|oo)t/;
    var mile = /miles?/;

    var millimeter = /millimet(?:er|re)s?|mm/;
    var centimeter = /centimet(?:er|re)s?|cm/;
    var meter = /met(?:er|re)s?|m/;
    var kilometer = /kilomet(?:er|re)s?|km/;
    var lightyear = /light ?years?|ly/;
    var astronomical = /astronomical units?|au/;
    var parsec = /parsecs?|pc/;

    var teaspoon = /teaspoons?|tsp/;
    var tablespoon = /tablespoons?|tbsp/;
    var flounce = /fluid ounces?|fl ?oz/;
    var cup = /cups?/;
    var pint = /pints?|pt/;
    var quart = /quarts?|qt/;
    var gallon = /gallons?|gal/;

    var cubic_millimeter = /cubic (?:millimet(?:er|re)s?|mm)/;
    var cubic_centimeter = /cubic (?:centimet(?:er|re)s?|cm)/;
    var cubic_meter = /cubic (?:met(?:er|re)s?|m)/;
    var cubic_kilometer = /cubic (?:kilomet(?:er|re)s?|km)/;
    var cubic_lightyear = /cubic (?:light ?years?|ly)/;

    var milliliter = /millilit(?:er|re)s?|ml/;
    var liter = /lit(?:er|re)s?|l/;
    var kiloliter = /kilolit(?:er|re)s?|kl/;

    var ounce = /ounces?|oz/;
    var pound = /pounds?|lbs?/;
    var ton = /tons?/;

    var milligram = /milligrams?|mg/;
    var gram = /grams?|g/;
    var kilogram = /kilograms?|kg/;

    var celsius = /celsius|c/;
    var fahrenheit = /fahrenheit|f/;
    var kelvin = /kelvin|k/;

    var regex = /(-?\d+(?:\.\d+)?) ?/;

    function toString(rgx) {
        var s = rgx.toString();
        return s.substring(1, s.length - 1);
    }

    var unitsRegex = '(' + toString(inch);
    [yard, foot, mile, millimeter, centimeter, meter, kilometer, teaspoon, tablespoon, flounce, cup, pint, quart, gallon, milliliter, liter, kiloliter,
     cubic_millimeter, cubic_centimeter, cubic_meter, cubic_kilometer, cubic_lightyear, ounce, pound, ton, milligram, gram, kilogram, lightyear, astronomical, parsec,
     celsius, fahrenheit, kelvin].forEach(function(t) {
        unitsRegex += '|' + toString(t);
    });
    unitsRegex += ')';

    units_regex = new RegExp('^' + toString(regex) + unitsRegex + ' to ' + unitsRegex + '$');

    units = {};

    units[foot] = {};
    {
        units[foot][inch] = 12.0;
        units[foot][yard] = 3.0;
        units[foot][mile] = 1.0/5280.0;
        units[foot][meter] = 0.3048;
    }

    units[meter] = {};
    {
        units[meter][millimeter] = 1000.0;
        units[meter][centimeter] = 100.0;
        units[meter][kilometer] = 0.001;
        units[meter][foot] = 3.28084;
        units[meter][lightyear] = Number('1.0570008340246154637094605244851E-16');
        units[meter][astronomical] = Number('6.68459e-12');
        units[meter][parsec] = Number('3.24078e-17');
    }

    units[cubic_meter] = {};
    {
        units[cubic_meter][cubic_millimeter] = 1000000000;
        units[cubic_meter][cubic_centimeter] = 1000000;
        units[cubic_meter][cubic_kilometer] = 0.000000001;
        units[cubic_meter][lightyear] = Number('1.18093e-48');
        units[cubic_meter][gallon] = 264.172;
        units[cubic_meter][liter] = 1000.0;
    }

    units[gallon] = {};
    {
        units[gallon][teaspoon] = 768.0;
        units[gallon][tablespoon] = 256.0;
        units[gallon][flounce] = 128.0;
        units[gallon][cup] = 16.0;
        units[gallon][pint] = 8.0;
        units[gallon][quart] = 4.0;
        units[gallon][liter] = 3.78541;
        units[gallon][cubic_meter] = 0.00378541;
    }

    units[liter] = {};
    {
        units[liter][milliliter] = 1000.0;
        units[liter][kiloliter] = 0.001;
        units[liter][gallon] = 0.264172;
        units[liter][cubic_meter] = 0.001;
    }

    units[pound] = {};
    {
        units[pound][ounce] = 16.0;
        units[pound][ton] = 1.0/2000.0;
        units[pound][gram] = 453.592;
    }

    units[gram] = {};
    {
        units[gram][milligram] = 1000.0;
        units[gram][kilogram] = 0.001;
        units[gram][pound] = 0.00220462;
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
        bot.sayDirect(from, to, module.exports['convert'].help);
        return;
    }

    var result = new RegExp(units_regex).exec(text.toLowerCase());

    if(!result) {
        bot.sayDirect(from, to, 'Incorrect conversion request');
        return;
    }

    var value = Number(result[1]);
    var convertFrom = result[2];
    var convertTo = result[3];

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

    // console.log(toString(foundFrom) + ' ' + toString(foundFromBase) + ' ' + toString(foundToBase) + ' ' + toString(foundTo));

    function unsupported() {
        bot.sayDirect(from, to, 'Unsupported conversion');
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

    exec_context['_'] = converted;
    bot.sayDirect(from, to, value + ' ' + convertFrom + ' = ' + converted + ' ' + convertTo);
}

function money(bot, from, to, text, message) {
    if(!text) {
        bot.sayDirect(from, to, module.exports['money'].help);
        return;
    }

    var money_regex = /^(\d+(?:\.\d+)?) ?([A-Z]{3}) TO ([A-Z]{3})$/;
    var result = money_regex.exec(text.toUpperCase());
    if(!result) {
        bot.sayDirect(from, to, 'Incorrect money conversion request');
        return;
    }

    var value = Number(result[1]);
    var fromCurr = result[2];
    var toCurr = result[3];

    console.log(value + ' ' + fromCurr + ' to ' + toCurr);

    if(fromCurr === toCurr) {
        bot.sayDirect(from, to, 'date = ' + new Date().toUTCString() + ', ' + value + ' ' + fromCurr + ' = ' + value + ' ' + toCurr);
    }
    else if(fromCurr === 'BTC' || toCurr === 'BTC') {
        var reversed = false;

        var targetCurr;

        if(toCurr === 'BTC') {
            targetCurr = fromCurr;
            reversed = true;
        } else {
            targetCurr = toCurr;
        }

        require('https').get('https://api.bitcoinaverage.com/ticker/global/' + targetCurr + '/', function(response) {
            var data = '';
            response.on('data', function(d) {
                data += d.toString();
            });
            response.on('end', function() {
                try {
                    var json = JSON.parse(data);
                    var converted = reversed ? value / json.last : value * json.last;

                    converted = Math.round(converted * 100) / 100;

                    bot.sayDirect(from, to, 'date = ' + new Date(json.timestamp).toUTCString() + ', ' + value + ' ' + fromCurr + ' = ' + converted + ' ' + toCurr);
                } catch(e) {
                    bot.sayDirect(from, to, 'Unsupported conversion');
                    console.error(e.message + ' - ' + data);
                }
            });
        }).on('error', function(err) {
            bot.sayDirect(from, to, 'Error accessing bitcoinaverage API');
        });
    } else {
        require('http').get('http://api.fixer.io/latest?base=' + fromCurr + '&symbols=' + toCurr, function(response) {
            var data = '';
            response.on('data', function(d) {
                data += d.toString();
            });
            response.on('end', function() {
                try {
                    var json = JSON.parse(data);
                    if(!json.rates[toCurr])
                        throw new Error('unsupported');

                    var converted = value * json.rates[toCurr];
                    converted = Math.round(converted * 100) / 100;

                    bot.sayDirect(from, to, 'date = ' + json.date + ', ' + value + ' ' + fromCurr + ' = ' + converted + ' ' + toCurr);
                } catch(e) {
                    bot.sayDirect(from, to, 'Unsupported conversion');
                    console.error(e.message + ' - ' + data);
                }
            });
        }).on('error', function(err) {
            bot.sayDirect(from, to, 'Error accessing fixer.io API');
        });
    }
}

var blacklist = op_only_action(false, function(bot, from, to, text, message) {
    var parts = text.split(' ');
    if(parts[0].toLowerCase() === 'list') {
        if(parts.length > 1) {
            bot.sayDirect(from, to, 'Usage: !blacklist list');
            return;
        }

        var s = '';
        if(config.url_blacklist) {
            config.url_blacklist.forEach(function(b) {
                s += b + ' - ';
            });
            s = s.substring(0, s.length - 3);
        }
        
        bot.sayDirect(from, to, s);
    } else if(parts[0].toLowerCase() === 'add') {
        if(parts.length == 1) {
            bot.sayDirect(from, to, 'Usage: !blacklist add mydomain.tld');
            return;
        }

        for(var i = 1; i < parts.length; i++) {
            var url = parts[i];

            if(config.url_blacklist) {
                config.url_blacklist.push(url);
            } else {
                config.url_blacklist = [url];
            }
        }

        save_config();

        bot.sayDirect(from, to, 'Ok.');
    } else if(parts[0].toLowerCase() === 'remove') {
        if(parts.length == 1) {
            bot.sayDirect(from, to, 'Usage: !blacklist remove mydomain.tld');
            return;
        }

        for(var i = 1; i < parts.length; i++) {
            var index;
            if((index = config.url_blacklist.findIndex(function(value) {
                return value === parts[i];
            })) != -1) {
                config.url_blacklist.splice(index, 1);
                save_config();
            }
        }

        bot.sayDirect(from, to, 'Ok.');
    } else {
        bot.sayDirect(from, to, module.exports['blacklist'].help);
    }
});

function eightball(bot, from, to, text, message) {
    if(!text) {
        bot.sayDirect(from, to, module.exports['eightball'].help);
        return;
    }
    
    var options = ['It is certain', 'It is decidedly so', 'Without a doubt', 'Yes, definitely', 'You may rely on it',
                   'As I see it, yes', 'Most likely', 'Outlook good', 'Yes', 'Signs point to yes', 'Reply hazy try again',
                   'Ask again later', 'Better not tell you now', 'Cannot predict now', 'Concentrate and ask again',
                   'Don\'t count on it', 'My reply is no', 'My sources say no', 'Outlook not so good', 'Very doubtful'];

    bot.sayDirect(from, to, choose_random(options));
}

var math_game_sessions = {};

function math_game(bot, from, to, text, message) {
    var answer = 0;

    var val1 = Math.round(Math.random() * 1000);
    var op1 = choose_random('+-*/');

    var val2;
    switch(op1) {
        case '+':
           val2 = Math.round(Math.random() * 500);
           answer = val1 + val2;
           break;
        case '-':
            do {
                val2 = Math.round(Math.random() * 500);
            } while(val2 > val1);
            answer = val1 - val2;
            break;
        case '*':
            val2 = Math.round(Math.random() * 100);
            answer = val1 * val2;
            break;
        case '/':
            val2 = Math.round(Math.random() * 100);
            val1 = Math.round(Math.random() * 100) * val2;
            answer = val1 / val2;
            break;
    }

    var op2 = choose_random('+-');

    var val3;
    switch(op2) {
        case '+':
           val3 = Math.round(Math.random() * 500);
           answer += val3;
           break;
        case '-':
            do {
                val3 = Math.round(Math.random() * 500);
            } while(val3 > answer);
            answer -= val3;
            break;
    }

    math_game_sessions[from] = {
        timestamp: Date.now(),
        answer: answer,
        tries: 3
    };

    bot.sayDirect(from, to, 'Solve: ' + val1 + ' ' + op1 + ' ' + val2 + ' ' + op2 + ' ' + val3);
}

function math_answer(bot, from, to, text, message) {
    if(!text) {
        bot.sayDirect(from, to, module.exports['mathanswer']);
        return;
    }

    if(!math_game_sessions[from]) {
        bot.sayDirect(from, to, 'No game started.');
        return;
    }

    var num = Number(text);

    if(Number.isNaN(num)) {
        bot.sayDirect(from, to, 'Not a number!');
        return;
    }

    if(num === math_game_sessions[from].answer) {
        bot.sayDirect(from, to, 'Correct! You solved it in' + time_diff(math_game_sessions[from].timestamp));
        delete math_game_sessions[from];
    } else if(--math_game_sessions[from].tries == 0) {
        bot.sayDirect(from, to, 'Incorrect! Out of tries, answer: ' + math_game_sessions[from].answer);
        delete math_game_sessions[from];
    } else {
        bot.sayDirect(from, to, 'Incorrect! You have ' + math_game_sessions[from].tries + ' tries left');
    }
}

// var current_votebans = {};

// function voteban(bot, from, to, text, message) {
//     if(!text) {
//         bot.sayDirect(from, to, module.exports['voteban'].help);
//         return;
//     }

//     if(to === bot.nick) {
//         bot.sayDirect(from, to, 'Can\'t voteban anyone in pm!');
//         return;
//     }

//     var nick = text.trim();
//     if(bot.chans[to].users[nick] === undefined) {
//         bot.sayDirect(from, to, nick + ' is not in this channel.');
//         return;
//     }

//     if(!current_votebans[nick]) {
//         bot.sayDirect(from, to, 'Voteban has started on ' + nick + '. 1 vote / 3 votes needed.');
//         current_votebans[nick] = 1;
//     } else if(++current_votebans[nick] == 3) {
//         bot.sayDirect(from, to, 'Voteban successful!');
//         bot.action(to, 'bans ' + nick + ' from ' + to + ' FOREVER!');
//         delete current_votebans[nick];
//     } else {
//         bot.sayDirect(from, to, 'Voteban on ' + nick + ': ' + current_votebans[nick] + ' / 3 votes needed.');
//     }
// }

function joke(bot, from, to, text, message) {
    if(!text) {
        if(config.jokes && config.jokes.length > 0) {
            bot.sayDirect(from, to, choose_random(config.jokes));
        } else {
            bot.sayDirect(from, to, 'I don\'t know any jokes :(');
        }
    } else {
        var parts = text.split(/\s/);
        switch(parts[0].toLowerCase()) {
            case 'add':
                if(parts.length === 1) {
                    bot.sayDirect(from, to, 'Usage: !joke add My jokes are very funny!');
                    return;
                }

                var j = text.substring(4).trim();
                if(config.jokes) {
                    config.jokes.push(j);
                } else {
                    config.jokes = [j];
                }

                save_config();
                bot.sayDirect(from, to, 'Ok.')
                break;
            case 'remove':
                if(parts.length === 1) {
                    bot.sayDirect(from, to, 'Usage: !joke add My jokes are - This will remove the *only* joke that matches (case INsensitive).');
                    return;
                }

                if(config.jokes) {
                    var j = text.substring(7).trim().toLowerCase();

                    var idx = undefined;
                    var ret = config.jokes.findIndex(function(val, i) {
                        if(val.toLowerCase().startsWith(j)) {
                            if(idx === undefined) {
                                idx = i;
                                return false;
                            } else {
                                return true;
                            }
                        }

                        return false;
                    });

                    if(ret === -1) {
                        if(idx === undefined) {
                            bot.sayDirect(from, to, 'Could not find matching joke.');
                        } else {
                            var found = config.jokes.splice(idx, 1);
                            save_config();

                            bot.sayDirect(from, to, 'Removed matching joke: ' + found[0]);
                        }
                    } else {
                        bot.sayDirect(from, to, 'Found more than one matching jokes.');
                    }
                } else {
                    bot.sayDirect(from, to, 'I don\'t know any jokes :(');
                }
                break;
            default:
                bot.sayDirect(from, to, 'Usage: !joke [add|remove]');
                break;
        }
    }
}

function no_command(bot, from, to, text, message) {
    var off_log = text[0] === '-' ? '- ' : '';

    var url_regex = /(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?/g;

    var result;
    while((result = url_regex.exec(text)) != null) {
        console.log('Detected URL: ' + result[0]);

        var url_result = result[0];

        if(result[1] === undefined) {
            url_result = 'http://' + url_result;
        }

        var tldjs = require('tldjs');
        if(!tldjs.tldExists(url_result) || !tldjs.isValid(url_result)) {
            console.log('Not a valid URL or TLD');
            continue;
        }

        function get_title(url) {
            console.log('Retrieving title for ' + url);

            try {
                var parsed_url = require('url').parse(url);

                if(config.url_blacklist) {
                    var lc_url = parsed_url.hostname.toLowerCase();

                    if(config.url_blacklist.findIndex(function(value) {
                        if(value === lc_url) {
                            return true;
                        } else if(value.indexOf('*') != -1) {
                            var regex = new RegExp('^' + value.replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").replace(/[*]/g, '.*') + '$');
                            return regex.test(lc_url);
                        }

                        return false;
                    }) != -1) {
                        console.log('Matched blacklist entry.');
                        return;
                    }
                }

                var protocol = parsed_url.protocol === 'https:' ? require('https') : require('http');

                parsed_url.method = 'HEAD';

                var req = protocol.request(parsed_url, function(head_response) {
                    if(head_response.statusCode == 200) {
                        var content_type = head_response.headers['Content-Type'] || head_response.headers['content-type'];
                        if(!content_type || content_type.indexOf('text/html') === -1) {
                            console.log('Content not HTML for ' + url);
                            return;
                        }

                        parsed_url.method = undefined;
                        var req = protocol.get(parsed_url, function(response) {
                            var data = '';
                            var found = false;

                            function test_title() {
                                var title_regex = /<\s*title.*?>([\s\S]+?)</mi;
                                var title = title_regex.exec(data);

                                if(title && title[1]) {
                                    title = title[1].replace(/\r|\n/g, ' ');

                                    var htmlencode = require('htmlencode');

                                    console.log('URL Title: ' + title);
                                    bot.say(to === bot.nick ? from : to, off_log + htmlencode.htmlDecode(title.trim()) + ' - ' + parsed_url.protocol + '//' + parsed_url.hostname);

                                    found = true;
                                    req.abort();
                                }
                            }

                            response.on('data', function(chunk) {
                                data += chunk.toString();
                                if(!found)
                                    test_title();
                            });
                            response.on('end', function() {
                                if(!found)
                                    test_title();
                            });
                        });
                        req.on('error', function(err) {
                            console.log('Could not reach ' + url + ': ' + err.message);
                        });
                        req.end();
                    } else if(Math.floor(head_response.statusCode / 100) == 3) {
                        console.log('Got redirect (' + head_response.statusCode + ') for ' + url);
                        var r = /^(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?$/;
                        if(head_response.headers.location && r.test(head_response.headers.location)) {
                            get_title(head_response.headers.location);
                        } else {
                            console.log('Did not receive valid redirect for ' + url + ': ' + head_response.headers.location);
                        }
                    } else {
                        console.log('Got status ' + head_response.statusCode + ' for ' + url);
                    }
                });
                req.on('error', function(err) {
                    console.log('Could not reach ' + url + ': ' + err.message);
                });
                req.end();
            } catch(e) {
                console.log('Could not parse ' + url);
            }
        };

        get_title(url_result);
    }
}

function _msg(bot, from, to, text, message) {
    handle_notify(bot, from, to, text, message);

    if(to !== bot.nick && text[0] !== '-') {
        handle_last_seen(bot, from, to, text, message);
        writeToLog(to, '<' + from + '> ' + text);
    }
}

function _notice(bot, nick, to, text, message) {
    if(to === bot.nick) {
        console.log('NOTICE: -' + (nick === null ? 'Server' : nick) + '- ' + text);
    }
}

function _self(bot, to, text) {
    if(to === bot.channel) {
        if(text.startsWith('\x01ACTION')) {
            writeToLog(to, '* ' + bot.nick + text.substring(7, text.length - 1));
        } else {
            writeToLog(to, '<' + bot.nick + '> ' + text);
        }
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

function _init(bot, message) {
    if(config.password) {
        console.log('Identifying...');
        bot.say('NickServ', 'identify ' + config.password);
    }
}

function _joined(bot, channel, message) {
    console.log('Joined ' + channel);
}

function _join(bot, channel, nick, message) {
    handle_notify(bot, nick, channel, '[joined ' + channel + ']', message);
    handle_last_seen(bot, nick, channel, '[joined ' + channel + ']', message);
    writeToLog(channel, '*** ' + nick + ' (' + message.nick + '!' + message.user + '@' + message.host + ') has joined ' + channel);
}

function _quit(bot, channel, nick, reason, message) {
    _part(bot, channel, nick, reason, message);
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

function op_only_action(allow_pm, func) {
    return function(bot, from, to, text, message) {
        if((to === bot.nick && !allow_pm && bot.chans[bot.channel] && bot.chans[bot.channel].users[from] !== '@') || (bot.chans[to] && bot.chans[to].users[from] !== '@')) {
            bot.sayDirect(from, to, 'Only ops may use this command.');
            return;
        }

        func.apply(this, arguments);
    }
}

function time_diff(time) {
    var d = Date.now() - time;
    var s = '';
    [[1000,60,'second'], [60,60,'minute'], [60,24,'hour'], [24,365,'day'], [365,0,'year']].forEach(function(func, idx) {
         d = Math.floor(d / func[0]);
         var r = func[1] == 0 ? d : d % func[1];

        if(r > 0) {
            s = ' ' + r + ' ' + func[2] + (r > 1 ? 's' : '') + s;
        }
    });
    return s;
}

function choose_random(list) {
    return list[Math.floor(Math.random() * list.length)]
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

module.exports = {
    'ping': { func: ping, help: 'Replies with pong' },
    'notify': { func: notify, help: 'Usage: !notify nick message. Will send the message when the specified nick is seen. Same as !tell.' },
    'tell': { func: notify, help: 'Usage: !tell nick message. Will send the message when the specified nick is seen. Same as !notify.' },
    'slapmsg': { func: op_only_action(false, slap_msg), help: 'Usage: !slapmsg message. Adds a slap message to be used next time someone is slapped.' },
    'slap': { func: slap, help: 'Usage: !slap nick [message]. Will slap the nick with a creative message or optionally provided message.' },
    'calc': { func: calc, help: 'Usage: !calc 4 + 5. Same as !eval. Evaluates and prints a javascript expression.' },
    'eval': { func: calc, help: 'Usage: !eval 4 + 5. Same as !calc. Evaluates and prints a javascript expression.' },
    'exec': { func: op_only_action(false, exec), help: 'Usage: !exec print("Hello, world!"). Evaluates a javascript expression.' },
    'blacklist': { func: blacklist, help: 'Usage: !blacklist list|add|remove. Manage URL title-grabber blacklist.' },
    'lastseen': { func: last_seen, help: 'Usage: !lastseen nick. Prints how long ago nick was seen.' },
    'convert': { func: convert, help: 'Usage: !convert 45 feet to meters. Converts between different units.' },
    'money': { func: money, help: 'Usage: !money 1 USD to EUR. Converts between different currencies.' },
    'eightball': { func: eightball, help: 'Usage: !eightball Am I awesome?' },
    '8ball': { func: eightball, help: 'Usage: !8ball Am I awesome?' },
    'mathgame': { func: math_game, help: 'Play a math game!' },
    'mathanswer': { func: math_answer, help: 'Provide the answer to the math game.' },
    'joke': { func: joke, help: 'Usage: !joke [add|remove]' },
    // 'voteban': { func: voteban, help: 'Usage: !voteban nick. Starts a vote to ban the user.' },
    '_': no_command,
    '_init': _init,
    '_joined': _joined,
    '_msg': _msg,
    '_notice': _notice,
    '_self': _self,
    '_action': _action,
    '_mode': _mode,
    '_nick': _nick,
    '_join': _join,
    '_part': _part,
    '_quit': _quit,
    '_kick': _kick
};
