module.exports = {
    init: init
};

function init(bot, action, utils, config) {
    var last_seen_options = {
        name: 'lastseen',
        help: 'Usage: !lastseen nick. Prints how long ago nick was seen.',
        help_on_empty: true
    };

    action(last_seen_options, last_seen);

    action({name: '_msg'}, function(bot, from, to, text, message, utils, config) {
        if(to !== bot.nick && text[0] !== '-') {
            handle_last_seen(bot, from, to, text, message, utils, config);
        }
    });

    action({name: '_action'}, function(bot, from, to, text, message, utils, config) {
        if(to !== bot.nick) {
            handle_last_seen(bot, from, to, text, message, utils, config);
        }
    });

    action({name: '_join'}, function(bot, channel, nick, message, utils, config) {
        handle_last_seen(bot, nick, channel, '[joined ' + channel + ']', message, utils, config);
    });
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
