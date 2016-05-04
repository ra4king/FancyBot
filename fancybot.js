var irc = require('irc');
var reload = require('require-reload')(require);
var actions = reload('./actions');

var name = 'FancyBot';
var chan = '#java-gaming';

var bot = new irc.Client('irc.freenode.net', name, {
	userName: name,
	realEName: name,
	channels: [chan],
	autoRejoin: true
});

bot.on('registered', function(message) {
	console.log('Successfully joined freenode!');
});

bot.on('join', function(channel, nick, message) {
	if(nick === bot.nick) {
		actions['_init'](bot, channel, message);
	} else {
		actions['_join'](bot, channel, nick, message);
	}
});

bot.on('part', function(channel, nick, reason, message) {
	actions['_part'](bot, channel, nick, message);
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
					bot.say(to === bot.nick ? nick : to, 'Successfully reloaded the actions.');
				} catch(e) {
					bot.say(to === bot.nick ? nick : to, 'Failed to reload the actions: ' + e.message);
				}
				return;
			}
		}
		else if(actions[command]) {
			actions[command](bot, nick, to, index == -1 ? '' : text.substring(index).trim(), message);
			return;
		}
	}

	actions['_'](bot, nick, to, text, message);
});

bot.on('action', function(nick, to, text, message) {
	actions['_'](bot, nick, to, text, message);
})

process.on('exit', function() {
	console.log("Goodbye!");
})

console.log('Joining freenode...');
