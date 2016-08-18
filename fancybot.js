var irc = require('irc');
var reload = require('require-reload')(require);
var actions = reload('./actions');

var console_log = console.log;
var console_err = console.error;
console.log = function(text) {
    console_log(new Date().toUTCString() + ' - ' + text);
}
console.error = function(text) {
    console_err(new Date().toUTCString() + ' - ERROR: ' +  + text);
}

var name = 'FancyBot';
var chan = '#java-gaming';

var bot = new irc.Client('irc.freenode.net', name, {
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
    actions['_init'](bot, message);
});

bot.on('join', function(channel, nick, message) {
    if(nick === bot.nick) {
        actions['_joined'](bot, channel, message);
    } else {
        actions['_join'](bot, channel, nick, message);
    }
});

bot.on('part', function(channel, nick, reason, message) {
    actions['_part'](bot, channel, nick, reason, message);
});

bot.on('quit', function(nick, reason, channels, message) {
    actions['_quit'](bot, bot.channel, nick, reason, message);
});

bot.on('kick', function(channel, nick, by, reason ,message) {
    actions['_kick'](bot, channel, nick, by, reason, message);
});

bot.on('nick', function(oldnick, newnick, channels, message) {
    if(bot.nick != name) {
        bot.send('NICK', name);
    }

    if(newnick === name) {
        actions['_init'](bot, message);
    }

    actions['_nick'](bot, oldnick, newnick, channels, message);
});

bot.on('message', function(nick, to, text, message) {
    actions['_msg'](bot, nick, to, text, message);

    if(text[0] === '!') {
        var index = text.indexOf(' ');
        var command = text.substring(1, index == -1 ? undefined : index).trim();

        console.log('Detected command from ' + nick + ': ' + command);

        if(command === 'reload') {
            if(message.user === '~ra4king' && message.host === 'unaffiliated/ra4king') {
                try {
                    actions = reload('./actions');
                    bot.sayDirect(nick, to, 'Successfully reloaded the actions.');
                } catch(e) {
                    bot.sayDirect(nick, to, 'Failed to reload the actions ' + e.message);
                }
                return;
            }
        }
        else if(command === 'help') {
            if(index != -1 && index < text.length) {
                var help_command = text.substring(index + 1).trim();
                if(help_command[0] != '_' && actions[help_command]) {
                    bot.sayDirect(nick, to, actions[help_command].help);
                } else {
                    bot.sayDirect(nick, to, 'Command does not exist.');
                }
            } else {
                var commands = '';
                for(c in actions) {
                    if(c[0] !== '_') {
                        commands += ' ' + c;
                    }
                }
                bot.sayDirect(nick, to, 'Available commands:' + commands);
            }
        }
        else if(command[0] != '_' && actions[command]) {
            actions[command].func(bot, nick, to, index == -1 ? '' : text.substring(index).trim(), message);
            return;
        }
    }

    actions['_'](bot, nick, to, text, message);
});

bot.on('notice', function(nick, to, text, message) {
    actions['_notice'](bot, nick, to, text, message);
});

bot.on('selfMessage', function(to, text) {
    actions['_self'](bot, to, text);
});

bot.on('action', function(nick, to, text, message) {
    actions['_action'](bot, nick, to, text, message);
});

bot.on('+mode', function(channel, by, mode, argument, message) {
    actions['_mode'](bot, channel, by, '+' + mode, argument, message);
});

bot.on('-mode', function(channel, by, mode, argument, message) {
    actions['_mode'](bot, channel, by, '-' + mode, argument, message);
});

bot.on('error', function(message) {
    console.error(require('util').inspect(message));
});

process.on('exit', function() {
    console.log("Goodbye!");
});

console.log('Joining freenode...');
