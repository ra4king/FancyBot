module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'define',
        help: 'Usage: !define dudebro, looks up the definition of the word from UrbanDictionary',
        help_on_empty: true,
    };

    action(options, define);
}

function define(bot, from, to, text, message) {
    require('http').get('http://api.urbandictionary.com/v0/define?term=' + text, (response) => {
        var data = '';
        response.on('data', (d) => data += d.toString());
        response.on('end', () => {
            try {
                var json = JSON.parse(data);
                if(json.list.length == 0) {
                    return bot.sayDirect(from, to, 'No results for ' + text);
                }

                var result = json.list[0];
                bot.sayDirect(from, to, result.word + ': ' + result.definition + ' - ' + result.permalink);
            } catch(e) {
                console.error(data + ' ' + e);
                console.error(e.stack);
                bot.sayDirect(from, to, 'An error occurred: ' + e.message);
            }
        });
    }).on('error', (err) => {
        bot.sayDirect(from, to, 'Error accessing urbandictionary API');
    });
}
