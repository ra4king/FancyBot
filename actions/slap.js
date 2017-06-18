module.exports = {
    init: init
};

function init(action, utils, config) {
    if(!config.slap_messages) {
        config.slap_messages = [];
    }
    if(!config.to_slap) {
        config.to_slap = {};
    }

    var slapmsg_options = {
        name: 'slapmsg',
        list_name: 'slap_messages',
        element_name: 'slap message',
        help: 'Usage: !slapmsg list|add|remove message. Adds a slap message to be used next time someone is slapped.',
        remove_closest_match: true,
    };

    utils.create_list_action(action, slapmsg_options);

    var slap_options = {
        name: 'slap',
        help: 'Usage: !slap nick [message]. Will slap the nick with a creative message or optionally provided message.',
        help_on_empty: true,
    };

    action(slap_options, slap);

    action({name: '_action'}, function(bot, from, to, text, message, utils, config) {
        if(text.indexOf('slaps ' + bot.nick) != -1) {
            slap(bot, from, to, from, message, utils, config);
        }
    });

    action({name: '_join'}, function(bot, channel, nick, message) {
        if(nick in config.to_slap) {
            bot.action(bot.channel, 'slaps ' + nick + ' ' + config.to_slap[nick]);

            delete config.to_slap[nick];
            utils.save_config();
        }
    });

    action({name: '_nick'}, function(bot, oldnick, nick, channels, message) {
        if(nick in config.to_slap) {
            bot.action(bot.channel, 'slaps ' + nick + ' ' + config.to_slap[nick]);

            delete config.to_slap[nick];
            utils.save_config();
        }
    });
}

function is_in_channel(users, nick) {
    if(users[nick] !== undefined)
        return nick;

    nick = nick.toLowerCase();
    for(var user in users) {
        if(user.toLowerCase() === nick) {
            return user;
        }
    }

    return false;
}

function slap(bot, from, to, text, message, utils, config) {
    var idx = text.indexOf(' ');
    var nick = text.substring(0, idx == -1 ? undefined : idx).trim();

    if(nick === bot.nick) {
        bot.sayDirect(from, to, 'Now why would I slap myself?');
        return;
    }

    if(to == bot.nick && nick != from) {
        bot.sayDirect(from, to, 'There\'s nobdy to slap around here!');
        return;
    }

    var message = idx == -1 ? utils.choose_random(config.slap_messages) : text.substring(idx + 1).trim();

    var actual_nick = nick;
    if(to === bot.channel && !(actual_nick = is_in_channel(bot.chans[to.toLowerCase()].users, nick))) {
        config.to_slap[nick] = message;
        utils.save_config();

        bot.sayDirect(from, to, nick + ' is not in this channel. Will slap on join.');
        return;
    }

    bot.action(to === bot.nick ? from : to, 'slaps ' + actual_nick + ' ' + message);
}
