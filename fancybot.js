var irc = require('irc');
var fs = require('fs');
var EventEmitter = require('events');
var reload = require('require-reload')(require);
var utils;

if(!global.console_redirected) {
    var console_log = console.log;
    var console_err = console.error;
    console.log = function(text) {
        console_log(new Date().toUTCString() + ' - ' + text);
    }
    console.error = function(text) {
        console_err(new Date().toUTCString() + ' - ERROR: ' + text);
    }
    global.console_redirected = true;
}

var actions;
var modules = {};
var configs = {};
var globals = {};

function reset_actions() {
    for(var module in modules) {
        if(modules[module].destroy) {
            try {
                modules[module].destroy();
            } catch(e) {
                console.error('while destroying ' + module + ': ' + e);
            }
        }
    }

    actions = new EventEmitter();
    modules = {};
    globals = {};
}

function load_actions() {
    reset_actions();

    utils = reload('./utils.js');

    function help_on_empty(func) {
        return function(bot, from, to, text) {
            if(!text.trim()) {
                return true;
            } else {
                return func.apply(this, arguments);
            }
        }
    }

    function op_only(func) {
        return function(bot, from, to) {
            if(!bot.chans || !bot.chans[bot.channel.toLowerCase()] || bot.chans[bot.channel.toLowerCase()].users[from] !== '@') {
                bot.sayDirect(from, to, 'Only ops may use this command.');
                return;
            }

            return func.apply(this, arguments);
        }
    }

    function explicit_check(func, explicitly_allowed_users) {
        return function(bot, from, to) {
            if(!bot.chans || !bot.chans[bot.channel.toLowerCase()] || explicitly_allowed_users.indexOf(from) == -1) {
                bot.sayDirect(from, to, 'Only explicitly defined users may use this command.');
                return;
            }

            return func.apply(this, arguments);
        }
    }

    function no_pm(func) {
        return function(bot, from, to) {
            if(to === bot.nick && bot.chans[bot.channel] && bot.chans[bot.channel].users[from] !== '@') {
                bot.sayDirect(from, to, 'This command is not allowed in pm.');
            } else {
                return func.apply(this, arguments);
            }
        }
    }

    var help_msgs = {};

    actions.on('reload', op_only(function(bot, from, to, text, message) {
        console.log('Reloading actions.');

        for(var config in configs) {
            save_config(config, true);
        }

        var old_actions = actions;
        var old_globals = globals;

        try {
            load_actions();
            bot.sayDirect(from, to, 'Successfully reloaded actions.');
            console.log('Successfully reloaded actions.');
        } catch(e) {
            bot.sayDirect(from, to, 'Reloading attempt failed, could not reload actions: ' + e);
            console.error('Failed to reload actions: ' + e);
            console.error(e.stack);

            actions = old_actions;
            globals = old_globals;
        }
    }));
    help_msgs['reload'] = 'Usage: !reload. Reloads all actions, op only use.';

    actions.on('reloadbot', op_only(function(bot, from, to, text, message) {
        try {
            console.log('Reloading ' + bot.nick);

            for(var config in configs) {
                save_config(config, true);
            }

            try {
                bot.disconnect('Reloading...', function() {
                    global.is_reloading = true;
                    reload(process.argv[1]);
                });
            } catch(e) {
                bot.sayDirect(from, to, 'Reloading attempt failed, could not reload actions: ' + e);
                console.error('Failed to reload actions: ' + e);
                console.error(e.stack);
            }
        } catch(e) {
            console.error('Failed to reload the actions: ' + e)
            console.error(e.stack);
            bot.sayDirect(from, to, 'Failed to reload the actions ' + e.message);
        }
    }));
    help_msgs['reloadbot'] = 'Usage: !reloadbot. Reloads the bot entirely, including reconnecting to IRC, op only use.';

    actions.on('help', function(bot, from, to, text, message) {
        if(text) {
            if(help_msgs[text]) {
                bot.sayDirect(from, to, help_msgs[text]);
            } else {
                bot.sayDirect(from, to, 'No help message found for command \'' + text + '\'.');
            }
        } else {
            var commands = '';
            for(var command in actions._events) {
                if(command[0] !== '_') {
                    commands += ' ' + command;
                }
            }
            bot.sayDirect(from, to, 'Available commands:' + commands);
        }
    });
    help_msgs['help'] = 'Usage: !help [command]. Displays a help message for the command, or if ommitted lists all available commands.'

    fs.readdirSync('actions/').forEach(function(file) {
        if(!file.endsWith('.js')) return;

        var name = file.substring(0, file.length - 3);

        if(name === 'bot') {
            throw new Error('Cannot use reserved name \'bot\'.');
        }

        try {
            modules[name] = reload('./actions/' + file);
        } catch(e) {
            console.error('Error loading ' + name + ': ' + e);
            console.error(e.stack);
            return;
        }

        var action_utils = {
            save_config: save_config.bind(null, name),
            globals: globals,
            get_bot: function() {
                return bot;
            }
        };
        Object.assign(action_utils, utils);

        if(!configs[name]) {
            configs[name] = load_config(name);
        }
        var action_config = configs[name];

        function action(options, func) {
            if(options.name[0] !== '_') {
                if(actions.listenerCount(options.name.toLowerCase()) > 0) {
                    throw new Error('Cannot have two user actions registered to the same name.');
                }

                if(options.help_on_empty) {
                    func = help_on_empty(func);
                }
                if(options.explicitly_allowed_users) {
                    func = explicit_check(func, options.explicitly_allowed_users);
                } else if(options.op_only) {
                    func = op_only(func);
                }
                if(options.no_pm) {
                    func = no_pm(func);
                }

                help_msgs[options.name.toLowerCase()] = options.help;
            }

            var f = function(bot, from, to) {
                var args = Array.from(arguments).concat([action_utils, action_config]);
                if(func.apply(this, args) && options.name[0] !== '_' && options.help) {
                    bot.sayDirect(from, to, options.help);
                }
            };

            actions.on(options.name.toLowerCase(), f);
        }

        if(modules[name].init) {
            try {
                console.log('Loading ' + name);
                modules[name].init(action, action_utils, action_config);
            } catch(e) {
                console.error('Error initializing ' + name + ': ' + e);
                console.error(e.stack);
            }
        }
    });
}

function load_config(name) {
    try {
        var config = JSON.parse(fs.readFileSync('configs/' + name + '.json'));
        console.log('Loaded config');
        return config;
    } catch(e) {
        console.error('COULD NOT LOAD CONFIG: ' + e + '\n' + e.stack);
        return {};
    }
}

var configs_timeout = {};
function save_config(name, immediately) {
    var config = JSON.stringify(configs[name], null, 4);

    if(!configs_timeout[name]) {
        configs_timeout[name] = {
            save_config_count: 0,
            last_config_timeout: null,
        };
    }

    if(configs_timeout[name].save_config_count < 10 || immediately) {
        if(configs_timeout[name].last_config_timeout) {
            clearTimeout(configs_timeout[name].last_config_timeout);
            configs_timeout[name].save_config_count++;
        }

        if(immediately) {
            fs.writeFileSync('configs/' + name + '.json', config);
            configs_timeout[name].save_config_count = 0;
            configs_timeout[name].last_config_timeout = null;
        } else {
            configs_timeout[name].last_config_timeout = setTimeout(function() {
                configs_timeout[name].save_config_count = 0;
                configs_timeout[name].last_config_timeout = null;
                fs.writeFile('configs/' + name + '.json', config, function(err) {
                    if(err) {
                        console.error('COULD NOT WRITE CONFIG!');
                        console.error(err);
                    }
                });
            }, 1000);
        }
    }
}

var bot_config = JSON.parse(fs.readFileSync('config.json'));

load_actions();

var name = bot_config.name;
var server = bot_config.server;
var chan = bot_config.channel;

var bot = new irc.Client(server, name, {
    userName: name,
    realName: name,
    channels: [chan],
    autoRejoin: true
});
bot.channel = chan;

var check_nick = (function() {
    var lastCall = null;
    var retryCount = 0;
    return function() {
        if(lastCall) {
            if(++retryCount < 3) {
                clearTimeout(lastCall);
                lastCall = setTimeout(check_nick, 2000);
            }

            return;
        }

        if(bot.nick != name) {
            bot.send('NICK', name);
            lastCall = setTimeout(check_nick, 2000);
        } else {
            retryCount = 0;
            lastCall = null;
        }
    }
})();

bot.sayDirect = function(from, to, address, message) {
    if(message === undefined) {
        message = address;
        address = true;
    }

    if(to === bot.nick) {
        bot.say(from, message);
    } else {
        bot.say(to, (address ? (from + ': ') : '') + message);
    }
}

bot.on('registered', function(message) {
    check_nick();

    console.log('Successfully joined ' + server + '!');

    if(bot_config.password) {
        console.log('Identifying...');
        bot.say('NickServ', 'identify ' + bot_config.password);
    }

    actions.emit('_init', bot, message);
});

bot.on('join', function(channel, nick, message) {
    check_nick();

    if(nick === bot.nick) {
        if(global.is_reloading) {
            console.log('Successfully reloaded ' + name + '.');
            bot.say(channel, 'Successfully reloaded ' + name + '.');
            global.is_reloading = false;
        }

        console.log('Joined ' + channel);
        actions.emit('_joined', bot, channel, message);
    } else {
        actions.emit('_join', bot, channel, nick, message);
    }
});

bot.on('part', function(channel, nick, reason, message) {
    check_nick();
    actions.emit('_part', bot, channel, nick, reason, message);
});

bot.on('quit', function(nick, reason, channels, message) {
    check_nick();
    actions.emit('_quit', bot, bot.channel, nick, reason, message);
});

bot.on('kick', function(channel, nick, by, reason ,message) {
    check_nick();
    actions.emit('_kick', bot, channel, nick, by, reason, message);
});

bot.on('nick', function(oldnick, newnick, channels, message) {
    if(newnick === name) {
        if(bot_config.password) {
            console.log('Identifying...');
            bot.say('NickServ', 'identify ' + bot_config.password);
        }
        
        actions.emit('_init', bot, message);
    }

    actions.emit('_nick', bot, oldnick, newnick, channels, message);
});

bot.on('message', function(nick, to, text, message) {
    check_nick();

    actions.emit('_msg', bot, nick, to, text, message);

    if(text[0] === '!') {
        var index = text.indexOf(' ');
        var command = text.substring(1, index == -1 ? undefined : index).trim().toLowerCase();

        console.log('Detected command from ' + nick + ': ' + text);

        if(command[0] != '_' && actions.emit(command, bot, nick, to, index == -1 ? '' : text.substring(index).trim(), message)) {
            return;
        }

        console.log('Command \'' + command + '\' not found.');
    }

    actions.emit('_', bot, nick, to, text, message);
});

bot.on('notice', function(nick, to, text, message) {
    check_nick();

    if(to === bot.nick) {
        console.log('NOTICE: -' + (nick === null ? 'Server' : nick) + '- ' + text);
    }

    actions.emit('_notice', bot, nick, to, text, message);
});

bot.on('selfMessage', function(to, text) {
    check_nick();
    actions.emit('_self', bot, to, text);
    console.log(bot.nick + ' ' + 'to ' + to + ': ' + text);
});

bot.on('action', function(nick, to, text, message) {
    check_nick();
    actions.emit('_action', bot, nick, to, text, message);
});

bot.on('+mode', function(channel, by, mode, argument, message) {
    check_nick();
    actions.emit('_mode', bot, channel, by, '+' + mode, argument, message);
});

bot.on('-mode', function(channel, by, mode, argument, message) {
    check_nick();
    actions.emit('_mode', bot, channel, by, '-' + mode, argument, message);
});

bot.on('error', function(message) {
    console.error(require('util').inspect(message));
});

process.on('exit', function() {
    console.log("Goodbye!");
    reset_actions();
});

console.log('Joining ' + server + '...');
