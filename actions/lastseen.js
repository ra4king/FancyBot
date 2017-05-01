module.exports = {
    init: init
};

function init(action, utils, config) {
    var last_seen_options = {
        name: 'lastseen',
        help: 'Usage: !lastseen nick. Prints how long ago nick was seen.',
        help_on_empty: true
    };

    action(last_seen_options, last_seen);

    action({name: '_msg'}, (bot, from, to, text, message, utils, config) => {
        if(to !== bot.nick && text[0] !== '-') {
            handle_last_seen(bot, from, to, text, message, utils, config);
        }
    });

    action({name: '_action'}, (bot, from, to, text, message, utils, config) => {
        if(to !== bot.nick) {
            handle_last_seen(bot, from, to, text, message, utils, config);
        }
    });

    action({name: '_join'}, (bot, channel, nick, message, utils, config) => {
        handle_last_seen(bot, nick, channel, '[joined ' + channel + ']', message, utils, config);
    });

    // action({ name: 'rebuild-last-seen', op_only: true }, (bot, from, to, text, message, utils, config) => {
    //     var logs = require('fs').readdirSync('logs/').forEach((file) => {
    //         if(!file.endsWith('.log')) {
    //             return parseLog(idx + 1);
    //         }

    //         require('fs').readFile('logs/' + file, 'utf8', (err, contents) => {
    //             contents.toString().split('\n').forEach((line) => {
    //                 var msg_regex = /^\[(.+?)\]  (?:([<-])(.+?)[>-] )?(.+)$/;
    //                 var match = msg_regex.exec(line);
    //                 if(!match) {
    //                     return;
    //                 }

    //                 if(match[3] && match[3].toLowerCase().indexOf('fancybot') == -1) {
    //                     config[match[3]] = {
    //                         timestamp: new Date(match[1]).getTime(),
    //                         msg: match[4]
    //                     };
    //                 }
    //             });

    //             utils.save_config();
    //             console.log('Done rebuilding last seen for ' + file);
    //         });
    //     });
    // });
}

function last_seen(bot, from, to, text, message, utils, config) {
    if(config[text]) {
        var last_time = config[text].timestamp;
        var last_msg = config[text].msg;

        var s = utils.time_diff(last_time);

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

function handle_last_seen(bot, from, to, text, message, utils, config) {
    if(to !== bot.nick) {
        config[from] = {
            timestamp: Date.now(),
            msg: text
        };

        utils.save_config();
    }
}
