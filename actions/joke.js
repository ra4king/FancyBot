module.exports = {
    init: init
};

function init(action, utils, config) {
    var list_options = {
        name: 'joke',
        list_name: 'jokes',
        element_name: 'joke',
        help: 'Displays joke or manage list of jokes.',
        remove_closest_match: true,
        disable_list: true,
        on_empty: joke,
    };
    utils.create_list_action(action, list_options);
}

function joke(bot, from, to, message, utils, config) {
    if(config.jokes && config.jokes.length > 0) {
        bot.sayDirect(from, to, utils.choose_random(config.jokes));
    } else {
        bot.sayDirect(from, to, 'I don\'t know any jokes :(');
    }
}
