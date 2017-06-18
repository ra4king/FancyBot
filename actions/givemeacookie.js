//made by secrets

module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'givemeacookie',
        help: 'Usage: !givemeacookie'
    };

    action(options, give_me_a_cookie);
}

function give_me_a_cookie(bot, from, to, text, message, utils, config) {
    if(bot.chans[bot.channel.toLowerCase()].users[from] !== '@' && from != 'secrets'){
        bot.sayDirect(from, to, "No.");
        return;
    }

    //normal operations
    var types = ['big', 'yummy', 'scrumptious', 'hot', 'crunchy', 'chocolate'];
    bot.action(to === bot.nick ? from : to, 'gives a ' + utils.choose_random(types) + ' cookie to ' + from);

    //is this cookie baked?
    if(Math.random() < 0.3) {
        bot.sayDirect(from, to, 'Heeey mannn. I added a reaal extra special ingreddient to that cookie :}. hahaaa');
    }
}
