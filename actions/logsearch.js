module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'logsearch',
        help: 'Usage: !logsearch asdf. Returns most recent result of search term.',
        help_on_empty: true
    };

    action(options, logsearch);

    options = {
        name: 'logcount',
        help: 'Usage: !logcount asdf. Returns the number of times the phrase was said.',
        help_on_empty: true
    }

    action(options, logcount);
}

function logsearch(bot, from, to, text, message) {
    require('https').get('https://www.roiatalla.com/jgo-logs?type=json&regex=true&search=' + encodeURIComponent(text), (response) => {
        var data = '';
        response.on('data', (d) => data += d.toString());
        response.on('end', () => {
            try {
                var json = JSON.parse(data);
            } catch(e) {
                return bot.sayDirect(from, to, data);
            }

            try {
                if(json.results.length == 0) {
                    return bot.sayDirect(from, to, 'No results for ' + text);
                }

                var result = json.results[0];
                bot.sayDirect(from, to, false, text + ': ' + json.results.length + ' search results - https://www.roiatalla.com/jgo-logs?search=' + encodeURIComponent(text));
                bot.sayDirect(from, to, false, 'Top result: ' + result.line);
                bot.sayDirect(from, to, false, 'Direct link: https://www.roiatalla.com' + result.url);
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

function logcount(bot, from, to, text, message) {
    var search = '\\b' + text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&') + '\\b';

    require('https').get('https://www.roiatalla.com/jgo-logs?type=json&regex=true&search=' + encodeURIComponent(search), (response) => {
        var data = '';
        response.on('data', (d) => data += d.toString());
        response.on('end', () => {
            try {
                var json = JSON.parse(data);
            } catch(e) {
                return bot.sayDirect(from, to, data);
            }

            try {
                if(json.results.length == 0) {
                    return bot.sayDirect(from, to, 'No results for ' + text);
                }

                var result = json.results[0];
                bot.sayDirect(from, to, text + ': ' + json.results.length + ' occurrences.');
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
