module.exports = {
    time_diff: time_diff,
    choose_random: choose_random,
    create_list_action: create_list_action,
};

/*
Returns a string representing the time difference between now and the supplied time.

Parameters:
    time: number, prior time in milliseconds elapsed since UNIX epoch.

Returns:
    String representing time difference in format: Y year[s], D day[s], H hour[s], M minute[s], S second[s].
*/
function time_diff(time) {
    var d = Date.now() - time;
    var s = '';
    [[1000,60,'second'], [60,60,'minute'], [60,24,'hour'], [24,365,'day'], [365,0,'year']].forEach(function(func, idx) {
         d = Math.floor(d / func[0]);
         var r = func[1] == 0 ? d : d % func[1];

        if(r > 0) {
            s = ' ' + r + ' ' + func[2] + (r > 1 ? 's' : '') + s;
        }
    });
    return s;
}

/*
Returns a random element from the list.

Paremeters:
    list: list or string, indexable list of elements.

Returns:
    Random element from the list.
*/
function choose_random(list) {
    return list[Math.floor(Math.random() * list.length)]
}

/*
Creates and registers an action that maintains a list with list/add/remove capabilities.
Usually used in conjunction with other commands or functionalities that require a user-maintained list.

Parameters:
    action: function, action that is passed to module init function
    options: {
        name: string, name of user-facing command.
        list_name: string, property name of array inside config.
        element_name: string, name of single element to be shown in status messages.
        help: string, help message appended after auto-generated usage.
        disable_list: boolean, 'list' subcommand disabled.
        remove_closest_match: boolean, 'remove' will best matching element, not exact match.
        op_only: boolean, only ops may use function.
        split_token: string or regex, token for splitting command text. When unset, no splitting is done.
        on_empty: function, to run when no subcommand is given.
    }
*/
function create_list_action(action, options) {
    function list_action(bot, from, to, text, message, utils, config) {
        if(!text.trim() && options.on_empty) {
            options.on_empty(bot, from, to, message, utils, config);
        }
        else {
            var space = text.indexOf(' ');
            var subcommand = text.substring(0, space == -1 ? text.length : space).trim().toLowerCase();
            var rest = text.substring(space == -1 ? text.length : space).trim();

            if(!options.disable_list && subcommand === 'list') {
                if(rest) {
                    ret.sayDirect(from, to, 'Usage: !' + options.name + ' list');
                    return;
                }

                var s = '';
                if(config[options.list_name]) {
                    config[options.list_name].forEach(function(b) {
                        s += b + ' - ';
                    });
                    s = s.substring(0, s.length - 3);
                }
                
                bot.sayDirect(from, to, s);
            } else if(subcommand === 'add') {
                if(!rest) {
                    bot.sayDirect(from, to, 'Usage: !' + options.name + ' add ' + options.element_name);
                    return;
                }

                var element_parts = rest.split(options.split_token);

                element_parts.forEach(function(part) {
                    part = part.trim();
                    if(!part) return;

                    if(config[options.list_name]) {
                        config[options.list_name].push(part);
                    } else {
                        config[options.list_name] = [part];
                    }
                });

                utils.save_config();

                bot.sayDirect(from, to, 'Ok.');
            } else if(subcommand === 'remove') {
                if(!rest) {
                    bot.sayDirect(from, to, 'Usage: !' + options.name + ' remove ' + options.element_name + '. Will remove closest match (case INsensitive).');
                    return;
                }

                var element_parts = rest.toLowerCase().split(options.split_token);
                if(options.remove_closest_match) {
                    element_parts.forEach(function(element) {
                        var idx = undefined;
                        var override = false;
                        var ret = config[options.list_name].findIndex(function(val, i) {
                            if(val.toLowerCase().startsWith(element)) {
                                if(idx === undefined) {
                                    idx = i;
                                    return false;
                                } else if(element === config[options.list_name][idx]) {
                                    override = true;
                                    return true;
                                } else {
                                    return true;
                                }
                            }

                            return false;
                        });

                        if(ret === -1 || override) {
                            if(idx === undefined) {
                                bot.sayDirect(from, to, 'Could not find matching ' + options.element_name + '.');
                            } else {
                                var found = config.jokes.splice(idx, 1);
                                utils.save_config();

                                bot.sayDirect(from, to, 'Removed closest matching ' + options.element_name + ': ' + found[0]);
                            }
                        } else {
                            bot.sayDirect(from, to, 'Found more than one matching ' + options.element_name + '.');
                        }
                    });
                } else {
                    element_parts.forEach(function(part) {
                        var index;
                        if((index = config[options.list_name].findIndex(function(value) {
                            return value === part;
                        })) != -1) {
                            bot.sayDirect(from, to, 'Removed ' + options.element_name + ': ' + config[options.list_name][index]);
                            config[options.list_name].splice(index, 1);
                            utils.save_config();
                        } else {
                            bot.sayDirect(from, to, 'Could not find matching ' + options.element_name + '.');
                        }
                    });
                }
            } else {
                return true;
            }
        }
    }

    var action_options = {
        name: options.name,
        help: 'Usage: !' + options.name + ' ' + (options.disable_list ? '' : 'list|') + 'add|remove. ' + options.help,
        help_on_empty: !options.on_empty,
        op_only: options.op_only,
    };

    action(action_options, list_action);
}
