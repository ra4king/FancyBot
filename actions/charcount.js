module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'charcount',
        help: 'Usage: !charcount some message. Counts the number of characters and words in the message',
        help_on_empty: true
    };

    action(options, charcount);
}

function charcount(bot, from, to, text, message, utils, config) {
    var wordCount = 0;
    text.split(' ').forEach((word) => {
        if(word.trim()) wordCount++;
    });

    bot.sayDirect(from, to, 'Character count: ' + text.length + '. Word count: ' + wordCount);
}
