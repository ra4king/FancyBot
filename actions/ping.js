module.exports = {
    init: init
};

function init(bot, action, config) {
    var options = {
        name: 'ping',
        help: 'Replies with pong',
    };

    action(options, function(bot, from, to, text, message, utils, config) {
        bot.sayDirect(from, to, 'pong');
    });
}
