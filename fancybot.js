var irc = require('irc');
var fs = require('fs');
var EventEmitter = require('events');
var reload = require('require-reload')(require);
var utils;

var console_log = console.log;
var console_err = console.error;
console.log = function(text) {
    console_log(new Date().toUTCString() + ' - ' + text);
}
console.error = function(text) {
    console_err(new Date().toUTCString() + ' - ERROR: ' + text);
}

var config;

function load_config() {
    try {
        config = JSON.parse(fs.readFileSync('config.json'));
        console.log('Loaded config');
    } catch(e) {
        console.error('COULD NOT LOAD CONFIG: ' + e + '\n' + e.stack);
        config = {};
    }
}

var save_config_count = 0;
var last_config_timeout = null;
function save_config() {
    if(save_config_count < 10) {
        if(last_config_timeout) {
            clearTimeout(last_config_timeout);
            save_config_count++;
        }

        last_config_timeout = setTimeout(function() {
            save_config_count = 0;
            last_config_timeout = null;
            fs.writeFile('config.json', JSON.stringify(config, null, 4), function(err) {
                if(err)
                    console.error('ERROR: COULD NOT WRITE CONFIG!');
            });
        }, 1000);
    }
}

var actions = new EventEmitter();
var modules;
var globals;

function load_actions() {
    load_config();

    utils = reload('./utils.js');

    if(modules) {
        for(var module in modules) {
            if(modules[module].destroy) {
                try {
                    modules[module].destroy();
                } catch(e) {
                    console.error('while destroying ' + module + ': ' + e);
                }
            }
        }
    }

    actions.removeAllListeners();
    modules = {};
    globals = {};

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
        try {
            console.log('Reloading actions...');
            load_actions();
            console.log('Successfully reloaded the actions.');
            bot.sayDirect(from, to, 'Successfully reloaded the actions.');
        } catch(e) {
            console.log('Failed to reload the actions ' + e + '\n' + e.stack);
            bot.sayDirect(from, to, 'Failed to reload the actions ' + e.message);
        }
    }));
    help_msgs['reload'] = 'Usage: !reload. Reloads all actions, op only use.';

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
            throw 'Cannot use reserved name \'bot\'.';
        }

        modules[name] = reload('./actions/' + file);

        var action_utils = {
            save_config: save_config,
            globals: globals,
        };
        Object.assign(action_utils, utils);

        if(!config[name]) {
            config[name] = {};
        }
        var action_config = config[name];

        function action(options, func) {
            if(options.name[0] !== '_') {
                if(actions.listenerCount(options.name) > 0) {
                    throw 'Cannot have two user actions registered to the same name.';
                }

                if(options.help_on_empty) {
                    func = help_on_empty(func);
                }
                if(options.op_only) {
                    func = op_only(func);
                }
                if(options.no_pm) {
                    func = no_pm(func);
                }

                help_msgs[options.name] = options.help;
            }

            var f = function(bot, from, to) {
                var args = Array.from(arguments).concat([action_utils, action_config]);
                if(func.apply(this, args) && options.name[0] !== '_' && options.help) {
                    bot.sayDirect(from, to, options.help);
                }
            };

            actions.on(options.name, f);
        }

        if(modules[name].init) {
            modules[name].init(action, action_utils, action_config);
            console.log('Loaded ' + name);
        }
    });
}

load_actions();

var name = config.bot && config.bot.name ? config.bot.name : 'FancyBot';
var server = config.bot && config.bot.server ? config.bot.server : 'irc.freenode.net';
var chan = config.bot && config.bot.channel ? config.bot.channel : '##FancyBot';

var bot = new irc.Client(server, name, {
    userName: name,
    realName: name,
    channels: [chan],
    autoRejoin: true
});
bot.channel = chan;

bot.sayDirect = function(from, to, message) {
    if(to === bot.nick) {
        bot.say(from, message);
    } else {
        bot.say(to, from + ': ' + message);
    }
}

bot.on('registered', function(message) {
    console.log('Successfully joined freenode!');

    if(config.bot && config.bot.password) {
        console.log('Identifying...');
        bot.say('NickServ', 'identify ' + config.bot.password);
    }

    actions.emit('_init', bot, message);
});

bot.on('join', function(channel, nick, message) {
    if(nick === bot.nick) {
        console.log('Joined ' + channel);
        actions.emit('_joined', bot, channel, message);
    } else {
        actions.emit('_join', bot, channel, nick, message);
    }
});

bot.on('part', function(channel, nick, reason, message) {
    actions.emit('_part', bot, channel, nick, reason, message);
});

bot.on('quit', function(nick, reason, channels, message) {
    actions.emit('_quit', bot, bot.channel, nick, reason, message);
});

bot.on('kick', function(channel, nick, by, reason ,message) {
    actions.emit('_kick', bot, channel, nick, by, reason, message);
});

bot.on('nick', function(oldnick, newnick, channels, message) {
    if(bot.nick != name) {
        bot.send('NICK', name);
    }

    if(newnick === name) {
        actions.emit('_init', bot, message);
    }

    actions.emit('_nick', bot, oldnick, newnick, channels, message);
});

bot.on('message', function(nick, to, text, message) {
    actions.emit('_msg', bot, nick, to, text, message);

    if(text[0] === '!') {
        var index = text.indexOf(' ');
        var command = text.substring(1, index == -1 ? undefined : index).trim();

        console.log('Detected command from ' + nick + ': ' + command);
        
        if(command[0] != '_' && actions.emit(command, bot, nick, to, index == -1 ? '' : text.substring(index).trim(), message)) {
            return;
        }

        console.log('Command \'' + command + '\' not found.');
    }

    actions.emit('_', bot, nick, to, text, message);
});

bot.on('notice', function(nick, to, text, message) {
    if(to === bot.nick) {
        console.log('NOTICE: -' + (nick === null ? 'Server' : nick) + '- ' + text);
    }

    actions.emit('_notice', bot, nick, to, text, message);
});

bot.on('selfMessage', function(to, text) {
    actions.emit('_self', bot, to, text);
});

bot.on('action', function(nick, to, text, message) {
    actions.emit('_action', bot, nick, to, text, message);
});

bot.on('+mode', function(channel, by, mode, argument, message) {
    actions.emit('_mode', bot, channel, by, '+' + mode, argument, message);
});

bot.on('-mode', function(channel, by, mode, argument, message) {
    actions.emit('_mode', bot, channel, by, '-' + mode, argument, message);
});

bot.on('error', function(message) {
    console.error(require('util').inspect(message));
});

process.on('exit', function() {
    console.log("Goodbye!");
});

console.log('Joining freenode...');
