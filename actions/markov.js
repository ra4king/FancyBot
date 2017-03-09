module.exports = {
    init: init,
    destroy: destroy
};

const n = 2;

var mappings = {};
var keyCount = 0;
var lineCount = 0;
var characterCount = 0;

var annoyingModeRate = 0;

var lastTimeout = null;

function init(action, utils, config) {
    var options = {
        name: 'markov',
        help: 'Usage: !markov [stats | initial inputs]. With no arguments, it generates a random message.',
    };

    action(options, markov);

    action({ name: 'markovset', op_only: true }, function(bot, from, to, text) {
        if(!text) {
            bot.sayDirect(from, to, 'Give me a rate from 0 to 100');
            return;
        }

        annoyingModeRate = parseInt(text);
        bot.sayDirect(from, to, 'Annoying mode set with a rate of ' + annoyingModeRate + '%');
    });

    function onMessage(bot, from, to, text) {
        createMapping(text);

        if(text.indexOf(bot.nick) != -1 || (100 * Math.random()) < annoyingModeRate) {
            let split = text.split(' ');
            let idx = Math.floor(Math.random() * (split.length - n + 1));
            let input = split.slice(idx, idx + n);
            var message = generateMarkov(input);
            setTimeout(() => bot.sayDirect(from, to, false, message.join(' ')), 700);
        }
    }

    action({ name: '_msg' }, function(bot, from, to, text) {
        if(to !== bot.nick && text[0] !== '-') {
            onMessage(bot, from, to, text);
        }
    });

    action({ name: '_action' }, function(bot, from, to, text) {
        if(to !== bot.nick && !text.startsWith('slaps')) {
            onMessage(bot, from, to, from + ' ' + text);
        }
    });

    const fs = require('fs');

    fs.readdirSync('logs/').forEach((file) => {
        if(!file.endsWith('.log')) return;

        var contents = fs.readFileSync('logs/' + file).toString().split('\n');

        contents.forEach((line) => {
            var msg_regex = /^(\[.+?\])  ([<-].+?[>-] |\* )?(.+)$/;
            var match = msg_regex.exec(line);
            if(!match || !match[2]) {
                return;
            }

            createMapping(match[3]);
        });
    });

    keyCount = Object.keys(mappings).length;

    function sayRandomly() {
        var bot = utils.get_bot();
        markov(bot, '', bot.channel, '');

        var milliseconds = Math.floor(Math.random() * 3 * 60 * 60 * 1000) + 30 * 60 * 1000;
        console.log('markov: waiting for ' + milliseconds + ' ms');

        lastTimeout = setTimeout(sayRandomly, milliseconds);
    }

    lastTimeout = setTimeout(sayRandomly, 10000);
}

function destroy() {
    mappings = {};
    clearTimeout(lastTimeout);
}

function cleanString(str) {
    return str.trim().toLowerCase().replace(/[^a-zA-Z0-9,\.]/g, '');
}

function addMapping(key, value) {
    if(mappings[key]) {
        mappings[key].push(value);
    } else {
        mappings[key] = [value];
    }
}

function createMapping(text) {
    lineCount++;
    characterCount += text.length;

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
                addMapping(null, key);
                firstRun = false;
            }

            addMapping(key, value);

            lastPieces.shift();
        }

        lastPieces.push(piece);
    });

    addMapping(JSON.stringify(lastPieces), null);
}

function capitalize(prev, str) {
    if(str && (prev == null || prev.charAt(prev.length - 1) == '.')) {
        return str.substring(0,1).toUpperCase() + str.substring(1);
    } else {
        return str;
    }
}

function generateMessage(min_length, initialInputs) {
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

function generateMarkov(initialInputs) {
    const min_length = 6;

    var message = [];
    do {
        message = message.concat(generateMessage(min_length - message.length, initialInputs));
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
                bot.sayDirect(from, to, 'Line count: ' + lineCount + '. Charcter count: ' + characterCount + '. Key count: ' + keyCount);
                return;
            default:
                if(split.length != n) {
                    bot.sayDirect(from, to, 'I need exactly ' + n + ' words to generate a message.');
                    return;
                }

                initialInputs = split;
        }
    }

    var message = generateMarkov(initialInputs);
    bot.sayDirect(from, to, false, message.join(' '));
}
