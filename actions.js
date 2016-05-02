module.exports = {
	'ping': ping,
	'notify': notify,
	'calc': calc,
	'exec': exec,
	'_': no_command,
	'_init': _init,
	'_join': _join,
	'_part': _part
};

function sayDirect(bot, from, to, message) {
	if(to === bot.nick) {
		bot.say(from, message);
	} else {
		bot.say(to, from + ': ' + message);
	}
}

function ping(bot, from, to, text, message) {
	check_notify(bot, from, to);

	sayDirect(bot, from, to, 'pong');
}

var notify_messages = {};

function notify(bot, from, to, text, message) {
	check_notify(bot, from, to);

	var idx = text.indexOf(' ');
	if(!text || idx == -1) {
		sayDirect(bot, from, to, 'Usage: !notify nick message');
		return;
	}

	var nick = text.substring(0, idx).trim();
	var msg = text.substring(idx + 1).trim();

	if(notify_messages[nick]) {
		notify_messages[nick].push(msg);
	} else {
		notify_messages[nick] = [from, msg];
	}

	sayDirect(bot, from, to, 'Ok');
}

function check_notify(bot, nick, channel) {
	if(notify_messages[nick]) {
		var from;
		notify_messages[nick].forEach(function(val) {
			if(!from) {
				from = val;
			} else {
				sayDirect(bot, nick, channel, from + ' says: ' + val);
			}
		});

		delete notify_messages[nick];
	}
}

function calc(bot, from, to, text, message) {
	exec(bot, from, to, 'print(' + text + ')', message, true);
}

function exec(bot, from, to, text, message, is_calc) {
	if(!is_calc && to !== bot.nick && bot.chans[to].users[from] !== '@') {
		return;
	}

	check_notify(bot, from, to);

	if(!text) {
		sayDirect(bot, from, to, 'Usage: !exec 4 + 5');
		return;
	}

	try {
		var vm = require('vm');

		var output = '';

		var context = {
			'print': function(text) {
				output += text.replace('\n', ' ') + ' ';
			}
		};

		vm.runInNewContext(text, context, { 'timeout': 1000 });

		if(output.length > 255) {
			sayDirect(bot, from, to, 'Too much output');
		} else if(!output) {
			sayDirect(bot, from, to, 'No output');
		} else {
			sayDirect(bot, from, to, output);
		}
	} catch(e) {
		sayDirect(bot, from, to, 'Error: ' + e.message);
	}
}

function no_command(bot, from, to, text, message) {
	check_notify(bot, from, to);

	var url_regex = /(http(s)?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]+)?/g;

	var result;
	while((result = url_regex.exec(text)) != null) {
		console.log("Detected URL: " + result[0]);

		var url = result[0];

		if(result[1] === undefined) {
			url = 'http://' + url;
		}

		var protocol = result[2] === 's' ? require('https') : require('http');

		try {
			var title_regex = /<\s*title[^>]*>(.+?)</gi;
			protocol.get(require('url').parse(url), function(response) {
				var data = '';
				response.on('data', function(chunk) {
					data += chunk.toString();
				});
				response.on('end', function() {
					var title = title_regex.exec(data);
					if(title && title[1]) {
						console.log("URL Title: " + title[1]);
						bot.say(to === bot.nick ? from : to, title[1] + ' - ' + url);
					} else {
						console.log("No title found.");
					}
				});
			}).on('error', function(err) {
				console.log('Could not reach ' + url + ': ' + err.message);
			});
		} catch(e) {
			console.log('Could not parse ' + url);
		}
	}
}

function _init(bot, channel, message) {
	console.log('Joined ' + channel);

	slapRandomly(bot, channel);
}

function _join(bot, channel, nick, message) {
	check_notify(bot, nick, channel);
}

function _part(bot, channel, nick, message) {
	// nothing to do...
}

function slapRandomly(bot, channel) {
	setTimeout(function() {
		try {
			var nicks = Object.keys(bot.chans[channel].users);
			var nick = nicks[Math.floor(Math.random() * nicks.length)];
			bot.action(channel, 'slaps ' + nick);
			slapRandomly(bot, channel);
		} catch(e) {
			console.error('Something went very wrong with slap! ' + e.message);
		}
	}, Math.round(60000 * (Math.random() * 15 + 200)));
}
