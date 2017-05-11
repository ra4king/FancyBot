//made by secrets

module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: '!givemeacookie',
        help: 'Usage: !givemeacookie',
        op_only: true,
        explicitly_allowed_users: ['secrets']
    };

    action(options, give_me_a_cookie);
}

function give_me_a_cookie(bot, from, to, text, message, utils, config) {

    //normal operations
    var types = ['big', 'yummy', 'scrumptious', 'hot', 'crunchy', 'oatmeal', 'chocolate'];
    bot.action(to === bot.nick ? from : to, 'gives a ' + utils.choose_random(types) + ' cookie to ' + from);

    //is this cookie baked?
    if(Math.random() < 0.1) {
        bot.action(to === bot.nick ? from : to, 'Heeey mannn. I added a reaal extra special ingreddient to that cookie :}. hahaaa');
    }
}
