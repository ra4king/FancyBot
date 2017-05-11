module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'makemeasandwich',
        help: 'Usage: !makemeasandwich',
    };

    action(options, make_me_a_sandwich);
}

function make_me_a_sandwich(bot, from, to, text, message, utils, config) {
    if(Math.random() < 0.1) {
        var types = ['tuna', 'ham and cheese', 'bacon', 'cheesy egg', 'chicken salad', 'caprese'];
        bot.action(to === bot.nick ? from : to, 'throws a ' + utils.choose_random(types) + ' sandwich at ' + from);
    } else {
        bot.sayDirect(from, to, 'No.');
    }
}
