module.exports = {
    init: init,
    destroy: destroy
};

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = Promise;

var mappingsSchema = new Schema({
    input: { type: String, index: true, validate: (s) => s || s === null },
    next: { type: String, validate: (s) => s || s === null },
    nick: { type: String, required: true }
});
mappingsSchema.index({ nick: 1, input: 1 }, { background: true });
try {
    var Mapping = mongoose.model('Mapping', mappingsSchema);
} catch(e) {
    var Mapping = mongoose.model('Mapping');
}

var n;
var lastTimeout;

function init(action, utils, config) {
    n = config.n = config.n || 2;
    utils.save_config();

    mongoose.connect('mongodb://roiatalla.com:27017/markov', { user: config.user, pass: config.pwd }, (err) => {
        if(err) {
            console.error('Markov: Error connecting to MongoDB.');
            console.error(err);
            return;
        }

        console.log('Markov: Successully connected to MongoDB.');
    });

    config.annoyingModeRate = config.annoyingModeRate || 0;
    utils.save_config();

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

    action({
        name: 'speaklike',
        help: 'Usage: !speaklike username. Give it a username and it will speak like them.'
    },
    function(bot, from, to, text) {
        if(!text) {
            bot.sayDirect(from, to, 'Give me a username!');
            return;
        }

        generateMarkov(text, null, (err, message) => {
            bot.sayDirect(from, to, false, err ? String(err) : message.join(' '));
        });
    });

    function onMessage(bot, from, to, text) {
        createMapping(from, text);

        if(text.indexOf(bot.nick) != -1 || (100 * Math.random()) < config.annoyingModeRate) {
            let split = text.split(' ');
            let idx = Math.floor(Math.random() * (split.length - n + 1));
            let input = split.slice(idx, idx + n);

            generateMarkov(null, input, (err, message) => {
                setTimeout(() => bot.sayDirect(from, to, false, err ? String(err) : message.join(' ')), 700);
            });
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
        console.log('Markov: waiting for ' + milliseconds + ' ms');

        lastTimeout = setTimeout(sayRandomly, milliseconds);
    }

    lastTimeout = setTimeout(sayRandomly, 10000);
}

function destroy() {
    mongoose.disconnect(() => console.log('Markov: Successfully disconnected from MongoDB.'));
}

function cleanString(str) {
    return str.trim().toLowerCase().replace(/[^\w,\.\/\\-]/g, '');
}

function addMapping(from, key, value) {
    new Mapping({
        input: key,
        next: value,
        nick: from
    }).save();
}

function createMapping(from, text) {
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
                addMapping(from, null, key);
                firstRun = false;
            }

            addMapping(from, key, value);

            lastPieces.shift();
        }

        lastPieces.push(piece);
    });

    if(lastPieces.length != n) {
        addMapping(from, JSON.stringify(lastPieces), null);
    }
}

function capitalize(prev, str) {
    if(str && (prev == null || prev.charAt(prev.length - 1) == '.')) {
        return str.substring(0,1).toUpperCase() + str.substring(1);
    } else {
        return str;
    }
}

function generateMessage(user, initialInputs, min_length, callback) {
    var generate = (keyString, keyArray) => {
        var prev = null;
        var message = keyArray.map((piece) => {
            var s = capitalize(prev, piece);
            prev = piece;
            return s;
        });

        var generateNext = () => {
            var query = { input: keyString };
            if(user) {
                query.nick = user;
            }

            Mapping.find(query, (err, mappings) => {
                if(err) {
                    console.error('Markov: error when getting mappings for input: ' + keyString);
                    console.error(err);
                    return callback(err);
                }

                if(mappings.length == 0) {
                    return callback(null, message);
                }

                let tries = 5;
                do {
                    let nextIdx = Math.floor(Math.random() * mappings.length);
                    var piece = mappings[nextIdx].next;
                } while(piece == null && --tries > 0 && message.length < min_length);

                if(!piece) {
                    return callback(null, message);
                }

                message.push(capitalize(prev, piece));

                keyArray.shift();
                keyArray.push(piece);

                prev = piece;
                keyString = JSON.stringify(keyArray);

                generateNext();
            });
        };

        generateNext();
    };

    if(initialInputs) {
        var keyArray = initialInputs.map(cleanString);
        var keyString = JSON.stringify(keyArray);
        generate(keyString, keyArray);
    } else {
        var query = { input: null };
        if(user) {
            query.nick = user;
        }

        Mapping.find(query).count((err, count) => {
            if(err) {
                console.error('Markov: error when getting null mappings.');
                console.error(err);
                return callback(err);
            }

            if(count == 0) {
                return callback('No mappings for ' + user);
            }


            var initialIdx = Math.floor(Math.random() * count);

            Mapping.find(query).skip(initialIdx).limit(1).exec((err, mapping) => {
                if(err) {
                    console.error('Markov: error when getting null mappings.');
                    console.error(err);
                    return callback(err);
                }

                var keyString = mapping[0].next;
                var keyArray = JSON.parse(keyString);
                generate(keyString, keyArray);
            })
        });
    }
}

function generateMarkov(user, initialInputs, callback) {
    const min_length = 6;
    var message = [];

    var generateSentence = () => {
        generateMessage(user, initialInputs, min_length - message.length, (err, sentence) => {
            if(err) {
                return callback(err);
            }

            message = message.concat(sentence);
            initialInputs = null;

            let last = message[message.length - 1];
            if(last && last.charAt(last.length - 1) != '.') {
                message[message.length - 1] += '.';
            }
            
            if(message.length < min_length) {
                generateSentence();
            } else {
                callback(null, message);
            }
        });
    };

    generateSentence();
}

function markov(bot, from, to, text) {
    var initialInputs = null;

    if(text) {
        var split = text.split(' ');

        switch(split[0]) {
            case 'stats':
                bot.sayDirect(from, to, 'Stats to be implemented...');
                //bot.sayDirect(from, to, 'Line count: ' + lineCount + '. Character count: ' + characterCount + '. Key count: ' + keyCount);
                return;
            default:
                if(split.length != n) {
                    bot.sayDirect(from, to, 'I need exactly ' + n + ' words to generate a message.');
                    return;
                }

                initialInputs = split;
        }
    }

    generateMarkov(null, initialInputs, (err, message) => {
        bot.sayDirect(from, to, false, err ? String(err) : message.join(' '));
    });
}
