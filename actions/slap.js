module.exports = {
    init: init
};

function init(action, utils, config) {
    if(!config.slap_messages) {
        config.slap_messages = [];
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
}

function slap(bot, from, to, text, message, utils, config) {
    var idx = text.indexOf(' ');
    var nick = text.substring(0, idx == -1 ? undefined : idx).trim();

    if(nick === bot.nick) {
        bot.sayDirect(from, to, 'Now why would I slap myself?');
        return;
    }

    if((to === bot.nick && nick !== from) || (to === bot.channel && bot.chans[to.toLowerCase()].users[nick] === undefined)) {
        bot.sayDirect(from, to, nick + ' is not in this channel.');
        return;
    }

    var message = idx == -1 ? undefined : text.substring(idx + 1).trim();
    if(!message) {
        message = utils.choose_random(config.slap_messages);
    }

    bot.action(to === bot.nick ? from : to, 'slaps ' + nick + ' ' + message);
}
