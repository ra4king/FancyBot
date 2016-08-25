module.exports = {
    init: init
};

function init(action, utils, config) {
    var quote_options = {
        name: 'quote',
        help: 'Usage: !quote nick [new quote]. If quote ommitted, prints random saved quote for nick. Otherwise stores new quote for nick.',
        help_on_empty: true,
        no_pm: true,
    };

    action(quote_options, quote);

    var unquote_options = {
        name: 'unquote',
        help: 'Usage: !unquote nick quote. Removes closest matching quote for nick.',
        help_on_empty: true,
        no_pm: true,
    };

    action(unquote_options, unquote);
}

function quote(bot, from, to, text, message, utils, config) {
    var idx = text.indexOf(' ');
    var nick = text.substring(0, idx == -1 ? undefined : idx).trim();
    var lower = nick.toLowerCase();

    if(idx == -1) {
        if(config[lower] && config[lower].length > 0) {
            bot.sayDirect(from, to, 'Random ' + nick + ' quote: ' + utils.choose_random(config[lower]));
        } else {
            bot.sayDirect(from, to, 'No quotes found for ' + nick + '.');
        }
    } else {
        var quote = text.substring(idx + 1).trim();

        if(config[lower]) {
            config[lower].push(quote);
        } else {
            config[lower] = [quote];
        }

        utils.save_config();
        bot.sayDirect(from, to, 'Ok.');
    }
}

function unquote(bot, from, to, text, message, utils, config) {
    var idx = text.indexOf(' ');

    if(idx == -1) {
        return true;
    }

    var nick = text.substring(0, idx).trim();
    var quote = text.substring(idx + 1).trim().toLowerCase();
    var lower = nick.toLowerCase();

    if(config[lower]) {
        var qIdx = -1;
        var override = false;
        var found = config[lower].findIndex(function(val, i) {
            if(val.toLowerCase().startsWith(quote)) {
                if(qIdx == -1) {
                    qIdx = i;
                    return false;
                } else if(quote === config[lower][qIdx]) {
                    override = true;
                    return true;
                } else {
                    return true;
                }
            }

            return false;
        });

        if(found === -1 || override) {
            if(qIdx != -1) {
                quote = config[lower][qIdx];
                config[lower].splice(qIdx, 1);
                if(config[lower].length === 0) {
                    delete config[lower];
                }
                utils.save_config();
                bot.sayDirect(from, to, 'Found and removed for ' + nick + ': ' + quote);
            } else {
                bot.sayDirect(from, to, 'Did not find matching quote for ' + nick + '.');
            }
        }
        else {
            bot.sayDirect(from, to, 'Found multiple matching quotes for ' + nick + '. Please be more specific.');
        }
    } else {
        bot.sayDirect(from, to, 'No quotes found for ' + nick + '.');
    }
}
