module.exports = {
    init: init
};

function init(bot, action, utils, config) {
    var options = {
        name: 'eightball',
        help: 'Usage: !eightball Am I awesome?',
        help_on_empty: true,
    };

    action(options, eightball);

    options = {
        name: '8ball',
        help: 'Usage: !8ball Am I awesome?',
        help_on_empty: true,
    };

    action(options, eightball);
}

function eightball(bot, from, to, text, message, utils, config) {
    var options = ['It is certain', 'It is decidedly so', 'Without a doubt', 'Yes, definitely', 'You may rely on it',
                   'As I see it, yes', 'Most likely', 'Outlook good', 'Yes', 'Signs point to yes', 'Reply hazy try again',
                   'Ask again later', 'Better not tell you now', 'Cannot predict now', 'Concentrate and ask again',
                   'Don\'t count on it', 'My reply is no', 'My sources say no', 'Outlook not so good', 'Very doubtful'];

    bot.sayDirect(from, to, utils.choose_random(options));
}
