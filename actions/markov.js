module.exports = {
    init: init,
    destroy: destroy
};

const n = 2;

var allMappings = {};
var keyCount = 0;
var lineCount = 0;
var characterCount = 0;

var lastUserMappings = {}
var lastUserName = null;

var lastTimeout = null;

function init(action, utils, config) {
    config.annoyingModeRate = config.annoyingModeRate || 0;
    utils.save_config();

    allMappings = generateForUser(null);

    action({
            name: 'markov',
            help: 'Usage: !markov [stats | initial inputs]. With no arguments, it generates a random message.',
        }, markov);

    action({ name: 'markovset', op_only: true }, function(bot, from, to, text) {
        if(!text) {
            bot.sayDirect(from, to, 'Give me a rate from 0 to 100');
            return;
        }

        config.annoyingModeRate = parseInt(text);
        utils.save_config();
        bot.sayDirect(from, to, 'Annoying mode set with a rate of ' + config.annoyingModeRate + '%');
    });

    // action({
    //         name: 'speaklike',
    //         help: 'Usage: !speaklike username. Give it a username and it will speak like them.'
    //     },
    //     function(bot, from, to, text) {
    //         if(!text) {
    //             bot.sayDirect(from, to, 'Give me a username!');
    //             return;
    //         }

    //         if(text != lastUserName) {
    //             bot.sayDirect(from, to, 'Analyzing logs of ' + text + '...');
    //             var mappings = generateForUser(text);
    //             if(Object.keys(mappings).length != 0) {
    //                 lastUserName = text;
    //                 lastUserMappings = mappings;
    //             } else {
    //                 bot.sayDirect(from, to, 'No logs found for ' + text + '.');
    //                 return;
    //             }
    //         }

    //         var message = generateMarkov(lastUserMappings, null);
    //         bot.sayDirect(from, to, false, message.join(' '))
    //     });

    function onMessage(bot, from, to, text) {
        createMapping(allMappings, text);

        if(from == lastUserName) {
            createMapping(lastUserMappings, text);
        }

        if(text.indexOf(bot.nick) != -1 || (100 * Math.random()) < config.annoyingModeRate) {
            let split = text.split(' ');
            let idx = Math.floor(Math.random() * (split.length - n + 1));
            let input = split.slice(idx, idx + n);
            var message = generateMarkov(allMappings, input);
            setTimeout(() => bot.sayDirect(from, to, false, message.join(' ')), 700);
        }
    }

    action({ name: '_msg' }, function(bot, from, to, text) {
        if(to !== bot.nick && text[0] !== '-' && text[0] !== '!') {
            onMessage(bot, from, to, text);
        }
    });

    action({ name: '_action' }, function(bot, from, to, text) {
        if(to !== bot.nick && !text.startsWith('slaps')) {
            onMessage(bot, from, to, from + ' ' + text);
        }
    });

    function sayRandomly() {
        var bot = utils.get_bot();
        markov(bot, '', bot.channel, '');

        var milliseconds = Math.floor(Math.random() * 4 * 60 * 60 * 1000) + 2 * 60 * 60 * 1000;
        console.log('markov: waiting for ' + milliseconds + ' ms');

        lastTimeout = setTimeout(sayRandomly, milliseconds);
    }

    lastTimeout = setTimeout(sayRandomly, 10000);
}

function destroy() {
    allMappings = {};
    lastUserMappings = {};
    clearTimeout(lastTimeout);
}

function cleanString(str) {
    return str.trim().toLowerCase().replace(/[^\w,\.\/\\-]/g, '');
}

function addMapping(mappings, key, value) {
    if(mappings[key]) {
        mappings[key].push(value);
    } else {
        mappings[key] = [value];
    }
}

function createMapping(mappings, text) {
    var firstRun = true;
    var lastPieces = [];
    text.split(' ').forEach((piece) => {
        piece = cleanString(piece);

        if(!piece)
            return;

        if(lastPieces.length == n) {
            var key = JSON.stringify(lastPieces);
            var value = piece;

            if(firstRun) {
                addMapping(mappings, null, key);
                firstRun = false;
            }

            addMapping(mappings, key, value);

            lastPieces.shift();
        }

        lastPieces.push(piece);
    });

    addMapping(mappings, JSON.stringify(lastPieces), null);
}

function generateForUser(user) {
    var mappings = {};

    const fs = require('fs');

    fs.readdirSync('logs/').forEach((file) => {
        if(!file.endsWith('.log')) return;

        var contents = fs.readFileSync('logs/' + file).toString().split('\n');

        contents.forEach((line) => {
            var msg_regex = /^(\[.+?\])  ([<-](.+?)[>-] |\* )?(.+)$/;
            var match = msg_regex.exec(line);
            if(!match || (!user && !match[3]) || (user && match[3] !== user)) {
                return;
            }

            var text = match[4];

            if(!user) {
                lineCount++;
                characterCount += text.length;
            }

            createMapping(mappings, text);
        });
    });

    if(!user) {
        keyCount = Object.keys(mappings).length;
    }

    return mappings;
}

function capitalize(prev, str) {
    if(str && (prev == null || prev.charAt(prev.length - 1) == '.')) {
        return str.substring(0,1).toUpperCase() + str.substring(1);
    } else {
        return str;
    }
}

function generateMessage(mappings, min_length, initialInputs) {
    if(initialInputs) {
        var keyArray = initialInputs.map(cleanString);
        var keyString = JSON.stringify(keyArray);
    } else {
        var initialIdx = Math.floor(Math.random() * mappings[null].length);
        var keyString = mappings[null][initialIdx];
        var keyArray = JSON.parse(keyString);
    }

    var prev = null;
    var message = keyArray.map((piece) => {
        var s = capitalize(prev, piece);
        prev = piece;
        return s;
    });

    do {
        if(!mappings[keyString])
            break;

        let tries = 5;
        do {
            let nextIdx = Math.floor(Math.random() * mappings[keyString].length);
            var piece = mappings[keyString][nextIdx];
        } while(piece == null && --tries > 0 && message.length < min_length);

        if(!piece) {
            break;
        }

        message.push(capitalize(prev, piece));

        keyArray.shift();
        keyArray.push(piece);

        prev = piece;
        keyString = JSON.stringify(keyArray);
    } while(piece != null);

    return message;
}

function generateMarkov(mappings, initialInputs) {
    const min_length = 6;

    var message = [];
    do {
        message = message.concat(generateMessage(mappings, min_length - message.length, initialInputs));
        initialInputs = null;

        let last = message[message.length - 1];
        if(last && last.charAt(last.length - 1) != '.') {
            message[message.length - 1] += '.';
        }
    } while(message.length < min_length);

    return message;
}

function markov(bot, from, to, text) {
    var initialInputs = null;

    if(text) {
        var split = text.split(' ');

        switch(split[0]) {
            case 'stats':
                bot.sayDirect(from, to, 'Line count: ' + lineCount + '. Character count: ' + characterCount + '. Key count: ' + keyCount);
                return;
            default:
                if(split.length != n) {
                    bot.sayDirect(from, to, 'I need exactly ' + n + ' words to generate a message.');
                    return;
                }

                initialInputs = split;
        }
    }

    var message = generateMarkov(allMappings, initialInputs);
    bot.sayDirect(from, to, false, message.join(' '));
}
