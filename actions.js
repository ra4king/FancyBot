module.exports = {
	'help': help,
	'ping': ping,
	'notify': notify,
	'calc': calc,
	'exec': exec,
	'notitle': no_title,
	'_': no_command,
	'_init': _init,
	'_join': _join,
	'_part': _part
};

var config;
try {
	config = JSON.parse(require('fs').readFileSync('config.json'));
	console.log('Loaded config');
} catch(e) {
	console.error('ERROR: COULD NOT LOAD CONFIG');
	config = {};
}

function help(bot, from, to, text, message) {
	var commands = '';
	for(c in module.exports) {
		if(c[0] !== '_') {
			commands += ' ' + c;
		}
	}
	sayDirect(bot, from, to, 'Available commands:' + commands);
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
	exec(bot, from, to, text, message, true);
}

function exec(bot, from, to, text, message, is_calc) {
	check_notify(bot, from, to);

	if(!is_calc && to !== bot.nick && bot.chans[to].users[from] !== '@') {
		return;
	}

	if(!text) {
		if(is_calc) {
			sayDirect(bot, from, to, 'Usage: !calc 4 + 5');
		} else {
			sayDirect(bot, from, to, 'Usage: !exec print("Hello, world!")');
		}
		return;
	}

	if(is_calc) {
		if(text.indexOf(';') != -1) {
			return;
		}

		text = 'print(' + text + ')';
	}

	try {
		var vm = require('vm');

		var output = '';
		
		var context = {
			'print': function(text) {
				output += text + ' ';
			}
		};

		vm.runInNewContext(text, context, { 'timeout': 1000 });

		if(output.length > 255) {
			sayDirect(bot, from, to, 'Too much output');
		} else if(!output) {
			sayDirect(bot, from, to, 'No output');
		} else {
			sayDirect(bot, from, to, output.replace('\n', ' '));
		}
	} catch(e) {
		sayDirect(bot, from, to, 'Error: ' + e.message);
	}
}

function no_title(bot, from, to, text, message) {
	check_notify(bot, from, to);

	if(to === bot.nick || bot.chans[to].users[from] !== '@') {
		return;
	}

	if(!text) {
		sayDirect(bot, from, to, 'Usage: !notitle URL');
		return;
	}

	var url_regex = /^(https?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]+)?\/?$/g;
	var result = url_regex.exec(text);
	if(!result) {
		sayDirect(bot, from, to, 'Not a URL');
		return;
	}

	var url_result = result[0];
	if(result[1] === undefined) {
		url_result = 'http://' + url_result;
	}
	url_result = url_result.toLowerCase();

	if(config.url_blacklist) {
		config.url_blacklist.push(url_result);
	} else {
		config.url_blacklist = [url_result];
	}

	require('fs').writeFile('config.json', JSON.stringify(config), function(err) {
		if(err)
			console.error('ERROR: COULD NOT WRITE CONFIG!');
	});

	sayDirect(bot, from, to, 'Ok');
}

function no_command(bot, from, to, text, message) {
	check_notify(bot, from, to);

	var url_regex = /(https?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]+)?\/?/g;

	var result;
	while((result = url_regex.exec(text)) != null) {
		console.log('Detected URL: ' + result[0]);

		var url_result = result[0];

		if(result[1] === undefined) {
			url_result = 'http://' + url_result;
		}

		function get_title(url) {
			console.log('Retrieving title for ' + url);

			if(config.url_blacklist) {
				var lc_url = url.toLowerCase();

				if(config.url_blacklist.findIndex(function(value) {
					return value === lc_url;
				}) != -1) {
					console.log('Matched blacklist entry.');
					return;
				}
			}

			try {
				var parsed_url = require('url').parse(url);

				var protocol = parsed_url.protocol === 'https:' ? require('https') : require('http');

				var title_regex = /<\s*title[^>]*>(.+?)</gi;
				protocol.get(parsed_url, function(response) {
					if(response.statusCode == 200) {
						var data = '';
						response.on('data', function(chunk) {
							data += chunk.toString();
						});
						response.on('end', function() {
							var title = title_regex.exec(data);
							if(title && title[1]) {
								console.log('URL Title: ' + title[1]);
								bot.say(to === bot.nick ? from : to, title[1] + ' - ' + url);
							} else {
								console.log('No title found.');
							}
						});
					} else if(Math.floor(response.statusCode / 100) == 3) {
						console.log('Got redirect (' + response.statusCode + ') for ' + url);
						var r = /^(https?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]+)?\/?$/g;
						if(response.headers.location && r.test(response.headers.location)) {
							get_title(response.headers.location);
						} else {
							console.log('Did not receive valid redirect for ' + url + ': ' + response.headers.location);
						}
					} else {
						console.log('Got status ' + response.statusCode + ' for ' + url);
					}
				}).on('error', function(err) {
					console.log('Could not reach ' + url + ': ' + err.message);
				});
			} catch(e) {
				console.log('Could not parse ' + url);
			}
		};

		get_title(url_result);
	}
}

function _init(bot, channel, message) {
	console.log('Joined ' + channel);
}

function _join(bot, channel, nick, message) {
	check_notify(bot, nick, channel);
}

function _part(bot, channel, nick, message) {
	// nothing to do...
}

function sayDirect(bot, from, to, message) {
	if(to === bot.nick) {
		bot.say(from, message);
	} else {
		bot.say(to, from + ': ' + message);
	}
}

// function slapRandomly(bot, channel) {
// 	setTimeout(function() {
// 		try {
// 			var nicks = Object.keys(bot.chans[channel].users);
// 			var nick = nicks[Math.floor(Math.random() * nicks.length)];
// 			bot.action(channel, 'slaps ' + nick);
// 			slapRandomly(bot, channel);
// 		} catch(e) {
// 			console.error('Something went very wrong with slap! ' + e.message);
// 		}
// 	}, Math.round(60000 * (Math.random() * 200 + 15)));
// }
