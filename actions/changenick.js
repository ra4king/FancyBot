module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'changenick',
        help: 'Usage: !changenick newnick',
        op_only: true,
    };

    action(options, change_nick);
}

function change_nick(bot, from, to, text, message, utils, config) {
    bot.send('NICK', text);
}
