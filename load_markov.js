const fs = require('fs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = Promise;

var config = JSON.parse(fs.readFileSync('configs/markov.json'));
mongoose.connect(config.url, { user: config.user, pass: config.pwd }, (err) => {
    if(err) {
        console.error('Markov: Error connecting to MongoDB.');
        console.error(err);
        return;
    }

    console.log('Markov: Successully connected to MongoDB.');

    generateAll();
});

var mappingsSchema = new Schema({
    input: { type: String, index: true, validate: (s) => s || s === null },
    next: { type: String, validate: (s) => s || s === null },
    nick: { type: String, required: true }
});
mappingsSchema.index({ nick: 1, input: 1 }, { background: true });
var Mapping = mongoose.model('Mapping', mappingsSchema);

var n = 2;

let emoticons = [':)', ';)', ':(', ';(', ':D', ';D', ':P', ';P', ':p', ';p', ':/', ';/', '):', ');',
                 ':-)', ';-)', ':-(', ';-(', ':-D', ';-D', ':-P', ';-P', ':-p', ';-p', ':-/', ';-/', ')-:', ')-;',
                 ':O', ':o', ':-O', ':-o', ':c', '8D', '8)', ':-c', '8-D', '8-)', 'D:', 'D-:',
                 '\\o/', '\\o\\', '/o/', '-_-', '-.-', '._.', ';_;', 'T_T', 'T__T', 'T___T', ':>', ':]', ':^)'];

function cleanString(str) {
    if(emoticons.indexOf(str) != -1) return str;

    return str.trim().toLowerCase().replace(/[^\w,:;\.\/\\\-]/g, '');
}

function toMapping(from, key, value) {
    return {
        input: key,
        next: value,
        nick: from
    };
}

function createMappings(from, text) {
    var mappings = [];

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
                mappings.push(toMapping(from, null, key));
                firstRun = false;
            }

            mappings.push(toMapping(from, key, value));

            lastPieces.shift();
        }

        lastPieces.push(piece);
    });

    if(lastPieces.length == n) {
        mappings.push(toMapping(from, JSON.stringify(lastPieces), null));
    }

    return mappings;
}

function forEachAsync(arr, max, callback, after) {
    var idx = 0;

    var next = () => {
        if(idx < arr.length) {
            callback(arr[idx++], next);
        } else if(after) {
            after();
            after = null;
        }
    }

    for(let i = 0; i < max && idx < arr.length; i++) {
        next();
    }
}

function generateAll() {
    fs.readdir('logs/', (err, files) => {
        if(err) {
            return console.error(err);
        }

        forEachAsync(files, 10, (file, next) => {
            if(idx >= logs.length) {
                mongoose.disconnect();
                return;
            }

            var file = logs[idx];

            if(!file.endsWith('.log')) {
                return next();
            }

            var mappings = []

            fs.readFile('logs/' + file, 'utf8', (err, contents) => {
                console.log('Markov: analyzing file: ' + file);

                contents.toString().split('\n').forEach((line) => {
                    var msg_regex = /^(\[.+?\])  ([<-](.+?)[>-] |\* )?(.+)$/;
                    var match = msg_regex.exec(line);
                    if(!match || !match[3]) {
                        return;
                    }

                    var text = match[4];
                    mappings = mappings.concat(createMappings(match[3], text));
                });

                Mapping.insertMany(mappings, (err) => {
                    if(err) {
                        console.error('Markov: error saving to mongodb');
                        console.error(err);
                        process.exit();
                    }

                    console.log('Markov: analyzation complete: ' + file);
                    next();
                });
            });
        });
    });
}
