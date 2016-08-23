module.exports = {
    init: init
};

function init(bot, action, utils, config) {
    var options = {
        name: 'source',
        help: 'Usage: !source',
    };

    action(options, source);
}

function source(bot, from, to, text, message, utils, config) {
    bot.sayDirect(from, to, 'https://www.github.com/ra4king/FancyBot');
}
