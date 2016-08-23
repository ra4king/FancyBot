module.exports = {
    init: init
};

function init(bot, action, utils, config) {
    if(!config.notify_messages) {
        config.notify_messages = {};
    }
    
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

    actions(options, notify);
    
    action({name: '_msg'}, handle_notify);
    action({name: '_action'}, handle_notify);
    action({name: '_join'}, handle_notify);
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

    if(config.notify_messages[notify_nick]) {
        config.notify_messages[notify_nick].push(notify);
    } else {
        config.notify_messages[notify_nick] = [notify];
    }

    utils.save_config();

    bot.sayDirect(from, to, 'Ok.');
}

function handle_notify(bot, from, to, text, message, utils, config) {
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
