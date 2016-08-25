//'Usage: !voteban nick. Starts a vote to ban the user.'

// var current_votebans = {};

// function voteban(bot, from, to, text, message) {
//     if(!text) {
//         bot.sayDirect(from, to, module.exports['voteban'].help);
//         return;
//     }

//     if(to === bot.nick) {
//         bot.sayDirect(from, to, 'Can\'t voteban anyone in pm!');
//         return;
//     }

//     var nick = text.trim();
//     if(bot.chans[to].users[nick] === undefined) {
//         bot.sayDirect(from, to, nick + ' is not in this channel.');
//         return;
//     }

//     if(!current_votebans[nick]) {
//         bot.sayDirect(from, to, 'Voteban has started on ' + nick + '. 1 vote / 3 votes needed.');
//         current_votebans[nick] = 1;
//     } else if(++current_votebans[nick] == 3) {
//         bot.sayDirect(from, to, 'Voteban successful!');
//         bot.action(to, 'bans ' + nick + ' from ' + to + ' FOREVER!');
//         delete current_votebans[nick];
//     } else {
//         bot.sayDirect(from, to, 'Voteban on ' + nick + ': ' + current_votebans[nick] + ' / 3 votes needed.');
//     }
// }
