module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'notify',
        help: 'Usage: !notify nick message. Will send the message when the specified nick is seen. Same as !tell',
        help_on_empty: true,
    };

    action(options, notify);

    options = {
        name: 'tell',
        help: 'Usage: !tell nick message. Will send the message when the specified nick is seen. Same as !notify',
        help_on_empty: true,
    };

    action(options, notify);

    action({name: '_msg'}, handle_notify);
    action({name: '_action'}, handle_notify);
    action({name: '_join'}, function(bot, channel, nick, message, utils, config) {
        handle_notify(bot, nick, channel, '', message, utils, config);
    });
}

function notify(bot, from, to, text, message, utils, config) {
    var idx = text.indexOf(' ');
    if(idx == -1) {
        return true;
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

    if(config[notify_nick]) {
        config[notify_nick].push(notify);
    } else {
        config[notify_nick] = [notify];
    }

    utils.save_config();

    bot.sayDirect(from, to, 'Ok.');
}

function handle_notify(bot, from, to, text, message, utils, config) {
    var nick = from.toLowerCase();
    if(config[nick]) {
        config[nick].forEach(function(val) {
            var ago = val.timestamp ? utils.time_diff(val.timestamp) : '';
            ago = ago ? ago + ' ago' : ' just now';
            var msg = val.nick + ago + ' said: ' + val.msg;

            if(val.pm) {
                bot.say(from, msg);
            }
            else {
                bot.sayDirect(from, to, msg);
            }
        });

        delete config[nick];
        utils.save_config();
    }
}
