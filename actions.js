module.exports = {
	'help': help,
	'ping': ping,
	'notify': notify,
	'calc': calc,
	'exec': exec,
	'notitle': no_title,
	'lastseen': last_seen,
	'convert': convert,
	'_': no_command,
	'_msg': _msg,
	'_init': _init,
	'_join': _join,
	'_part': _part
};

var config;
load_config();

function load_config() {
	try {
		config = JSON.parse(require('fs').readFileSync('config.json'));
		console.log('Loaded config');
	} catch(e) {
		console.error('ERROR: COULD NOT LOAD CONFIG');
		config = {};
	}
}

var save_count = 0;
var last_timeout = null;
function save_config() {
	if(save_count < 10) {
		if(last_timeout) {
			clearTimeout(last_timeout);
			save_count++;
		}

		last_timeout = setTimeout(function() {
			save_count = 0;
			last_timeout = null;
			require('fs').writeFile('config.json', JSON.stringify(config, null, 4), function(err) {
				if(err)
					console.error('ERROR: COULD NOT WRITE CONFIG!');
			});
		}, 5000);
	}
}

function _msg(bot, from, to, text, message) {
	if(config.notify_messages && config.notify_messages[nick]) {
		var from;
		config.notify_messages[nick].forEach(function(val) {
			if(!from) {
				from = val;
			} else {
				sayDirect(bot, nick, channel, from + ' says: ' + val);
			}
		});

		delete config.notify_messages[nick];
	}

	if(to !== bot.nick) {
		if(!config.last_seen) {
			config.last_seen = {};
		}

		config.last_seen[from] = [Date.now(), text];
		save_config();
	}
}

function last_seen(bot, from, to, text, message) {
	if(!text) {
		sayDirect(bot, from, to, 'Usage: !lastseen nick');
		return;
	}

	if(config.last_seen && config.last_seen[text]) {
		var last_time = config.last_seen[text][0];
		var last_msg = config.last_seen[text][1];

		var d = Date.now() - last_time;
		var s = '';
		[[1000,60,'second'], [60,60,'minute'], [60,24,'hour'], [24,365,'day'], [365,0,'year']].forEach(function(func, idx) {
		 	d = Math.floor(d / func[0]);
		 	var r = func[1] == 0 ? d : d % func[1];

			if(r > 0) {
				s = ' ' + r + ' ' + func[2] + (r > 1 ? 's' : '') + s;
			}
		});

		if(s) {
			sayDirect(bot, from, to, text + ' last seen' + s + ' ago: ' + last_msg);
		} else {
			sayDirect(bot, from, to, text + ' was just seen');
		}
	} else {
		sayDirect(bot, from, to, 'I have not seen ' + text);
	}
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
	sayDirect(bot, from, to, 'pong');
}

function notify(bot, from, to, text, message) {
	var idx = text.indexOf(' ');
	if(!text || idx == -1) {
		sayDirect(bot, from, to, 'Usage: !notify nick message');
		return;
	}

	var nick = text.substring(0, idx).trim();
	var msg = text.substring(idx + 1).trim();

	if(!config.notify_messages) {
		config.notify_messages = {};
	}

	if(config.notify_messages[nick]) {
		config.notify_messages[nick].push(msg);
	} else {
		config.notify_messages[nick] = [from, msg];
	}

	save_config();

	sayDirect(bot, from, to, 'Ok');
}

function calc(bot, from, to, text, message) {
	exec(bot, from, to, text, message, true);
}

function exec(bot, from, to, text, message, is_calc) {
	if(!is_calc && to !== bot.nick && bot.chans[to].users[from] !== '@') {
		sayDirect(bot, from, to, 'Only ops may use this command.');
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

var units_regex = init_units();
function init_units() {
	var inches = /inch(?:es)?/;
	var feet = /f(?:ee|oo)t/;
	var miles = /miles?/
	var millimeters = /millimet(?:er|re)s?|mm/;
	var centimeters = /centimet(?:er|re)s?|cm/;
	var decimeters = /decimet(?:er|re)s?|dm/;
	var meters = /met(?:er|re)s?|m/;
	var kilometers = /kilomet(?:er|re)s?|km/;
	var celsius = /celsius|c/;
	var fahrenheit = /fahrenheit|f/;

	var units = {};

	units[inches] = {};
	{
		units[inches][feet] = 1.0/12.0;
		units[inches][miles] = 1.0/(12.0 * 5280.0);
		units[inches][millimeters] = 25.4;
		units[inches][centimeters] = 2.54;
		units[inches][decimeters] = 0.254;
		units[inches][meters] = 0.0254;
		units[inches][kilometers] = 0.0000254;
	}

	units[feet] = {};
	{
		units[feet][miles] = 1.0/5280.0;
		units[feet][millimeters] = 304.8;
		units[feet][centimeters] = 30.48;
		units[feet][decimeters] = 3.048;
		units[feet][meters] = 0.3048;
		units[feet][kilometers] = 0.0003048;
	}

	units[miles] = {};
	{
		units[miles][millimeters] = 1609344;
		units[miles][centimeters] = 160934.4;
		units[miles][decimeters] = 16093.44;
		units[miles][meters] = 1609.344;
		units[miles][kilometers] = 1.609344;
	}

	units[millimeters] = {};
	{
		units[millimeters][centimeters] = 0.1;
		units[millimeters][decimeters] = 0.01;
		units[millimeters][meters] = 0.001;
		units[millimeters][kilometers] = 0.000001;
	}

	units[centimeters] = {};{
		units[centimeters][decimeters] = 0.1;
		units[centimeters][meters] = 0.01;
		units[centimeters][kilometers] = 0.00001;
	}

	units[decimeters] = {};
	{
		units[decimeters][meters] = 0.1;
		units[decimeters][kilometers] = 0.0001;
	}

	units[meters] = {};
	{
		units[meters][kilometers] = 0.001;
	}

	units[celsius] = {};
	{
		units[celsius][fahrenheit] = function(val, reverse) {
			if(reverse) {
				return (val - 32.0) * 5.0 / 9.0;
			} else {
				return (val * 9.0 / 5.0) + 32.0;
			}
		};
	}

	var regex = /(\d+(\.\d+)?) /;

	function toString(rgx) {
		var s = rgx.toString();
		return s.substring(1, s.length - 1);
	}

	var unitsRegex = '(' + toString(inches);
	for(var t in units) {
		if(t != inches) {
			unitsRegex += '|' + toString(t);
		}
	}
	unitsRegex += ')';

	return new RegExp(toString(regex) + unitsRegex + ' to ' + unitsRegex);
}

function convert(bot, from, to, text, message, notify_fail) {
	if(!text) {
		sayDirect(bot, from, to, 'Usage: !convert 45 feet to meters');
		return;
	}

	var result = new RegExp(units_regex).exec(text);
	if(!result) {
		sayDirect(bot, from, to, 'Incorrect conversion request');
		return;
	}

	var value = Number(result[1]);
	var convertFrom = result[3];
	var convertTo = result[4];

	console.log(value + ' ' + convertFrom + ' to ' + convertTo);

	var reversed = false;
	var foundFrom = null;
	var foundTo = null;

	for(var t in units) {
		var r = new RegExp(toString(t));

		if(!foundFrom && r.test(convertFrom)) {
			foundFrom = t;
			if(foundTo) {
				reversed = true;
				break;
			}
		}
		if(!foundTo && r.test(convertTo)) {
			foundTo = t;
			if(foundFrom) {
				break;
			}
		}
	}

	function unsupported() {
		sayDirect(bot, from, to, 'Unsupported conversion');
	}

	var converted;
	if(foundFrom == foundTo) {
		converted = value;
	} else {
		var factor;
		if(reversed) {
			if(!units[foundTo] || !units[foundTo][foundFrom]) {
				unsupported();
				return;
			}

			factor = 1.0 / units[foundTo][foundFrom];
		} else {
			if(!units[foundFrom] || !units[foundFrom][foundTo]) {
				unsupported();
				return;
			}

			factor = units[foundFrom][foundTo];
		}

		
		if(typeof factor == 'function') {
			converted = factor(value, reversed);
		} else {
			converted = value * factor;
		}
	}

	sayDirect(bot, from, to, value + ' ' + convertFrom + ' = ' + converted + ' ' + convertTo);
}

function no_title(bot, from, to, text, message) {
	if(to === bot.nick || !bot.chans[to] || bot.chans[to].users[from] !== '@') {
		sayDirect(bot, from, to, 'Only ops may use this command.');
		return;
	}

	if(!text) {
		sayDirect(bot, from, to, 'Usage: !notitle a.domain.com');
		return;
	}

	var url_regex = /^(https?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]*)?$/g;
	var result = url_regex.exec(text);
	if(!result) {
		sayDirect(bot, from, to, 'Not a URL');
		return;
	}

	var url = result[0];
	if(result[1] === undefined) {
		url = 'http://' + url;
	}
	var parsed_url = require('url').parse(url);

	if(config.url_blacklist) {
		config.url_blacklist.push(parsed_url.hostname.toLowerCase());
	} else {
		config.url_blacklist = [parsed_url.hostname.toLowerCase()];
	}

	sayDirect(bot, from, to, 'Ok');
}

function no_command(bot, from, to, text, message) {
	var url_regex = /(https?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]*)?/g;

	var result;
	while((result = url_regex.exec(text)) != null) {
		console.log('Detected URL: ' + result[0]);

		var url_result = result[0];

		if(result[1] === undefined) {
			url_result = 'http://' + url_result;
		}

		function get_title(url) {
			console.log('Retrieving title for ' + url);

			try {
				var parsed_url = require('url').parse(url);

				if(config.url_blacklist) {
					var lc_url = parsed_url.hostname.toLowerCase();

					if(config.url_blacklist.findIndex(function(value) {
						return value === lc_url;
					}) != -1) {
						console.log('Matched blacklist entry.');
						return;
					}
				}

				var protocol = parsed_url.protocol === 'https:' ? require('https') : require('http');

				protocol.get(parsed_url, function(response) {
					if(response.statusCode == 200) {
						var data = '';
						response.on('data', function(chunk) {
							data += chunk.toString();
						});
						response.on('end', function() {
							var title_regex = /<\s*title.*?>([\s\S]+?)</mi;
							var title = title_regex.exec(data);

							if(title && title[1]) {
								title[1] = title[1].replace(/\r|\n/g, ' ');

								console.log('URL Title: ' + title[1]);
								bot.say(to === bot.nick ? from : to, title[1] + ' - ' + parsed_url.protocol + '//' + parsed_url.hostname);
							} else {
								console.log('No title found.');
							}
						});
					} else if(Math.floor(response.statusCode / 100) == 3) {
						console.log('Got redirect (' + response.statusCode + ') for ' + url);
						var r = /^(https?\:\/\/)?(?:[\w\d-]+\.)+[\w\d-]+(?:\/[^\s]*)?$/;
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
	_msg(bot, nick, channel, '[joined ' + channel + ']', message);
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
