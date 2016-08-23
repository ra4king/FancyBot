module.exports = {
    init: init
};

function init(bot, action, utils, config) {
    var options = {
        name: 'joke',
        help: 'Usage: !joke [add|remove]',
    };

    action(options, joke);
}

// TODO: maybe use the utils list action.
function joke(bot, from, to, text, message, utils, config) {
    if(!text) {
        if(config.jokes && config.jokes.length > 0) {
            bot.sayDirect(from, to, utils.choose_random(config.jokes));
        } else {
            bot.sayDirect(from, to, 'I don\'t know any jokes :(');
        }
    } else {
        var parts = text.split(/\s/g);
        switch(parts[0].toLowerCase()) {
            case 'add':
                if(parts.length === 1) {
                    bot.sayDirect(from, to, 'Usage: !joke add My jokes are very funny!');
                    return;
                }

                var j = text.substring(4).trim();
                if(config.jokes) {
                    config.jokes.push(j);
                } else {
                    config.jokes = [j];
                }

                utils.save_config();
                bot.sayDirect(from, to, 'Ok.')
                break;
            case 'remove':
                if(parts.length === 1) {
                    bot.sayDirect(from, to, 'Usage: !joke add My jokes are - This will remove the *only* joke that matches (case INsensitive).');
                    return;
                }

                if(config.jokes) {
                    var j = text.substring(7).trim().toLowerCase();

                    var idx = undefined;
                    var ret = config.jokes.findIndex(function(val, i) {
                        if(val.toLowerCase().startsWith(j)) {
                            if(idx === undefined) {
                                idx = i;
                                return false;
                            } else {
                                return true;
                            }
                        }

                        return false;
                    });

                    if(ret === -1) {
                        if(idx === undefined) {
                            bot.sayDirect(from, to, 'Could not find matching joke.');
                        } else {
                            var found = config.jokes.splice(idx, 1);
                            save_config();

                            bot.sayDirect(from, to, 'Removed matching joke: ' + found[0]);
                        }
                    } else {
                        bot.sayDirect(from, to, 'Found more than one matching jokes.');
                    }
                } else {
                    bot.sayDirect(from, to, 'I don\'t know any jokes :(');
                }
                break;
            default:
                bot.sayDirect(from, to, 'Usage: !joke [add|remove]');
                break;
        }
    }
}
