module.exports = {
    init: init,
    destroy: destroy
};

const n = 2;

var mappings = {};
var keyCount = 0;
var lineCount = 0;
var characterCount = 0;

var lastTimeout = null;

function init(action, utils, config) {
    var options = {
        name: 'markov',
        help: 'Usage: !markov',
    };

    action(options, markov);

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

            var text = match[3];
            lineCount++;
            characterCount += text.length;

            var firstRun = true;
            var lastPieces = [];
            text.split(' ').forEach((piece) => {
                piece = piece.trim().toLowerCase();
                if(!piece)
                    return;

                piece = piece.replace(/[^a-zA-Z0-9'",;\.]/g, '');

                if(lastPieces.length == n) {
                    var key = JSON.stringify(lastPieces);
                    var value = piece;

                    if(firstRun) {
                        if(mappings[null]) {
                            mappings[null].push(key);
                        } else {
                            mappings[null] = [key];
                        }

                        firstRun = false;
                    }

                    if(mappings[key]) {
                        mappings[key].push(value);
                    } else {
                        mappings[key] = [value];
                    }

                    lastPieces.shift();
                }

                lastPieces.push(piece);
            });

            mappings[JSON.stringify(lastPieces)] = [null];
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

function capitalize(prev, str) {
    if(str && (prev == null || prev.charAt(prev.length - 1) == '.')) {
        return str.substring(0,1).toUpperCase() + str.substring(1);
    } else {
        return str;
    }
}

function generateMessage(min_length, initialInputs) {
    if(initialInputs) {
        var keyArray = initialInputs.map((s) => s.toLowerCase());
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

        if(piece == null) {
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

function markov(bot, from, to, text) {
    var initialInputs = null;

    if(text) {
        let split = text.split(' ');
        switch(split[0]) {
            case 'stats':
                bot.sayDirect(from, to, 'Line count: ' + lineCount + '. Charcter count: ' + characterCount + '. Key count: ' + keyCount);
                return;
            case 'generate':
                if(split.length != 3) {
                    bot.sayDirect(from, to, 'I need exactly 2 words to generate a message.');
                    return;
                }

                initialInputs = split.slice(1);
                break;
            default:
                bot.sayDirect(from, to, 'Did not understand command ' + text);
                return;
        }
    }

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

    bot.sayDirect(from, to, false, message.join(' '));
}
