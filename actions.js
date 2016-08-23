var fs = require('fs');

var config;
load_config();
function load_config() {
    try {
        config = JSON.parse(fs.readFileSync('config.json'));
        console.log('Loaded config');
    } catch(e) {
        console.error('ERROR: COULD NOT LOAD CONFIG');
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

function _notice(bot, nick, to, text, message) {
    if(to === bot.nick) {
        console.log('NOTICE: -' + (nick === null ? 'Server' : nick) + '- ' + text);
    }
}

function _init(bot, message) {
    if(config.password) {
        console.log('Identifying...');
        bot.say('NickServ', 'identify ' + config.password);
    }
}

function _joined(bot, channel, message) {
    console.log('Joined ' + channel);
}
