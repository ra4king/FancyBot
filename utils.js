module.exports = {
    help_on_empty: help_on_empty,
    op_only: op_only,
    no_pm: no_pm,
    time_diff: time_diff,
    choose_random: choose_random,
    create_list_action: create_list_action,
};

function help_on_empty(name, func) {
    return function(bot, from, to, text, message) {
        if(!text.trim()) {
            return true;
        } else {
            func.apply(this, arguments);
        }
    }
}

function op_only(func) {
    return function(bot, from, to, text, message) {
        if(!bot.chans || !bot.chans[bot.channel] || bot.chans[bot.channel].users[from] !== '@') {
            bot.sayDirect(from, to, 'Only ops may use this command.');
            return;
        }

        func.apply(this, arguments);
    }
}

function no_pm(func) {
    return function(bot, from, to, text, message) {
        if(!(to === bot.nick && bot.chans[bot.channel] && bot.chans[bot.channel].users[from] !== '@')) {
            func.apply(this, arguments);
        }
    }
}

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

function choose_random(list) {
    return list[Math.floor(Math.random() * list.length)]
}

function create_list_action(action, action_name, list_name, help, op_only) {
    function list_action(bot, from, to, text, message, utils, config) {
        var parts = text.split(/\s/g);
        if(parts[0].toLowerCase() === 'list') {
            if(parts.length > 1) {
                ret.sayDirect(from, to, 'Usage: !' + action_name + ' list');
                return;
            }

            var s = '';
            if(config[list_name]) {
                config[list_name].forEach(function(b) {
                    s += b + ' - ';
                });
                s = s.substring(0, s.length - 3);
            }
            
            bot.sayDirect(from, to, s);
        } else if(parts[0].toLowerCase() === 'add') {
            if(parts.length == 1) {
                bot.sayDirect(from, to, 'Usage: !' + action_name + ' add element');
                return;
            }

            for(var i = 1; i < parts.length; i++) {
                var url = parts[i].trim();
                if(!url)
                    continue;

                if(config[list_name]) {
                    config[list_name].push(url);
                } else {
                    config[list_name] = [url];
                }
            }

            save_config();

            bot.sayDirect(from, to, 'Ok.');
        } else if(parts[0].toLowerCase() === 'remove') {
            if(parts.length == 1) {
                bot.sayDirect(from, to, 'Usage: !' + action_name + ' remove element. Will remove closest match (case INsensitive).');
                return;
            }

            for(var i = 1; i < parts.length; i++) {
                var index;
                if((index = config[list_name].findIndex(function(value) {
                    return value === parts[i];
                })) != -1) {
                    config[list_name].splice(index, 1);
                    save_config();
                }
            }

            bot.sayDirect(from, to, 'Ok.');
        } else {
            return true;
        }
    }

    var options = {
        name: action_name,
        help: 'Usage: !' + action_name + ' list|add|remove. ' + help,
        help_on_empty: true,
        op_only: op_only,
    };

    action(options, list_action);
}
