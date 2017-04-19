module.exports = {
    init: init
};

var moment = require('moment');

var remindOnJoin = [];

function init(action, utils, config) {
    config.reminders = config.reminders || [];

    var copy = config.reminders.slice();
    setTimeout(() => copy.forEach((reminder) => handleReminder(utils.get_bot(), reminder, utils, config)), 1000);

    var options = {
        name: 'remindme',
        help: 'Usage: !remindme 5 hours 30 minutes: buy some milk',
        help_on_empty: true,
    };

    action(options, remindme);

    action({name: '_join'}, function(bot, channel, nick, message, utils, config) {
        remindOnJoin.forEach((reminder) => handleReminder(bot, reminder, utils, config));

        remindOnJoin = [];
    });
}

function remindme(bot, from, to, text, message, utils, config) {
    var colon = text.indexOf(':');
    if(colon == -1) {
        return true;
    }

    var time = text.substring(0, colon).trim().toLowerCase();

    var m = moment(time);
    if(!m.isValid()) {
        m = moment();

        var pieces = time.split(' ');

        var lastNum = 1;
        if(pieces.findIndex((piece) => {
                var n = Number(piece);
                if(n) {
                    lastNum = n;
                } else if(['years', 'y', 'quarters', 'Q', 'months', 'M', 'weeks', 'w', 'days', 'd',
                           'hours', 'h', 'minutes', 'm', 'seconds', 's', 'milliseconds', 'ms'].indexOf(piece) != -1) {
                    m.add(lastNum, piece);
                } else {
                    return true;
                }

                return false;
            }) != -1) {
            return true;
        }
    }

    var reminder = {
        time: m,
        nick: from,
        msg: text.substring(colon + 1).trim(),
        pm: to === bot.nick
    };

    config.reminders.push(reminder);
    utils.save_config();

    bot.sayDirect(from, to, 'Ok.');

    handleReminder(bot, reminder, utils, config);
}

function is_in_channel(users, nick) {
    if(users[nick] !== undefined)
        return nick;

    nick = nick.toLowerCase();
    for(var user in users) {
        if(user.toLowerCase() === nick) {
            return user;
        }
    }

    return false;
}

function handleReminder(bot, reminder, utils, config) {
    if(!reminder.time instanceof moment) {
        reminder.time = moment(reminder.time);
    }

    if(!is_in_channel(bot.chans[bot.channel.toLowerCase()].users, reminder.nick)) {
        return remindOnJoin.push(reminder);
    }

    if(reminder.time < new Date()) {
        bot.sayDirect(reminder.nick, reminder.pm ? bot.nick : bot.channel, reminder.msg);

        var idx = config.reminders.indexOf(reminder);
        if(idx != -1) {
            config.reminders.splice(idx, 1);
            utils.save_config();
        }
    } else {
        setTimeout(() => handleReminder(bot, reminder, utils, config), moment().toDate() - reminder.time.toDate());
    }
}
