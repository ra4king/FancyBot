module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'money',
        help: 'Usage: !money 1 USD to EUR. Converts between different currencies.',
        help_on_empty: true,
    };

    action(options, money);
}

function money(bot, from, to, text, message) {
    var money_regex = /^(\d+(?:\.\d+)?) ?([A-Z]{3}) TO ([A-Z]{3})$/;
    var result = money_regex.exec(text.toUpperCase());
    if(!result) {
        bot.sayDirect(from, to, 'Incorrect money conversion request');
        return;
    }

    var value = Number(result[1]);
    var fromCurr = result[2];
    var toCurr = result[3];

    console.log(value + ' ' + fromCurr + ' to ' + toCurr);

    if(fromCurr === toCurr) {
        bot.sayDirect(from, to, 'date = ' + new Date().toUTCString() + ', ' + value + ' ' + fromCurr + ' = ' + value + ' ' + toCurr);
    }
    else if(fromCurr === 'BTC' || toCurr === 'BTC') {
        var reversed = false;

        var targetCurr;

        if(toCurr === 'BTC') {
            targetCurr = fromCurr;
            reversed = true;
        } else {
            targetCurr = toCurr;
        }

        require('https').get('https://api.bitcoinaverage.com/ticker/global/' + targetCurr + '/', function(response) {
            var data = '';
            response.on('data', function(d) {
                data += d.toString();
            });
            response.on('end', function() {
                try {
                    var json = JSON.parse(data);
                    var converted = reversed ? value / json.last : value * json.last;

                    bot.sayDirect(from, to, 'date = ' + new Date(json.timestamp).toUTCString() + ', ' + value + ' ' + fromCurr + ' = ' + converted + ' ' + toCurr);
                } catch(e) {
                    bot.sayDirect(from, to, 'Unsupported conversion');
                    console.error(e.message + ' - ' + data);
                }
            });
        }).on('error', function(err) {
            bot.sayDirect(from, to, 'Error accessing bitcoinaverage API');
        });
    } else {
        require('http').get('http://api.fixer.io/latest?base=' + fromCurr + '&symbols=' + toCurr, function(response) {
            var data = '';
            response.on('data', function(d) {
                data += d.toString();
            });
            response.on('end', function() {
                try {
                    var json = JSON.parse(data);
                    if(!json.rates[toCurr])
                        throw new Error('unsupported');

                    var converted = value * json.rates[toCurr];
                    converted = Math.round(converted * 100) / 100;

                    bot.sayDirect(from, to, 'date = ' + json.date + ', ' + value + ' ' + fromCurr + ' = ' + converted + ' ' + toCurr);
                } catch(e) {
                    bot.sayDirect(from, to, 'Unsupported conversion');
                    console.error(e.message + ' - ' + data);
                }
            });
        }).on('error', function(err) {
            bot.sayDirect(from, to, 'Error accessing fixer.io API');
        });
    }
}
