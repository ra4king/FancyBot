module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'logsearch',
        help: 'Usage: !logsearch asdf. Returns most recent result of search term.',
        help_on_empty: true,
    };

    action(options, logsearch);
}

function logsearch(bot, from, to, text, message) {
    require('https').get('https://www.roiatalla.com/jgo-logs?type=json&search=' + text, (response) => {
        var data = '';
        response.on('data', (d) => data += d.toString());
        response.on('end', () => {
            try {
                var json = JSON.parse(data);
                if(json.results.length == 0) {
                    return bot.sayDirect(from, to, 'No results for ' + text);
                }

                var result = json.results[0];
                bot.sayDirect(from, to, json.search + ': ' + json.results.length + ' results. Top result: https://www.roiatalla.com' + result.url + ' - ' + result.line);
            } catch(e) {
                console.error(data + ' ' + e);
                console.error(e.stack);
                bot.sayDirect(from, to, 'An error occurred: ' + e.message);
            }
        });
    }).on('error', (err) => {
        bot.sayDirect(from, to, 'Error accessing roiatalla.com/jgo-logs API');
    });
}
