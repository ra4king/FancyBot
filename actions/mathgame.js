module.exports = {
    init: init
};

function init(action, utils, config) {
    var game_options = {
        name: 'mathgame',
        help: 'Usage: !mathgame. Play a math game!',
    };

    action(game_options, math_game);

    var answer_options = {
        name: 'mathanswer',
        help: 'Usage: !mathanswer 42. Provide the answer to the math game.',
        help_on_empty: true,
    };

    action(answer_options, math_answer);
}

var math_game_sessions = {};

function math_game(bot, from, to, text, message, utils, config) {
    var answer = 0;

    var val1 = Math.round(Math.random() * 1000);
    var op1 = utils.choose_random('+-*/');

    var val2;
    switch(op1) {
        case '+':
           val2 = Math.round(Math.random() * 500);
           answer = val1 + val2;
           break;
        case '-':
            do {
                val2 = Math.round(Math.random() * 500);
            } while(val2 > val1);
            answer = val1 - val2;
            break;
        case '*':
            val2 = Math.round(Math.random() * 100);
            answer = val1 * val2;
            break;
        case '/':
            val2 = Math.round(Math.random() * 100);
            val1 = Math.round(Math.random() * 100) * val2;
            answer = val1 / val2;
            break;
    }

    var op2 = utils.choose_random('+-');

    var val3;
    switch(op2) {
        case '+':
           val3 = Math.round(Math.random() * 500);
           answer += val3;
           break;
        case '-':
            do {
                val3 = Math.round(Math.random() * 500);
            } while(val3 > answer);
            answer -= val3;
            break;
    }

    math_game_sessions[from] = {
        timestamp: Date.now(),
        answer: answer,
        tries: 3
    };

    bot.sayDirect(from, to, 'Solve: ' + val1 + ' ' + op1 + ' ' + val2 + ' ' + op2 + ' ' + val3);
}

function math_answer(bot, from, to, text, message, utils, config) {
    if(!math_game_sessions[from]) {
        bot.sayDirect(from, to, 'No game started.');
        return;
    }

    var num = Number(text);

    if(Number.isNaN(num)) {
        bot.sayDirect(from, to, 'Not a number!');
        return;
    }

    if(num === math_game_sessions[from].answer) {
        bot.sayDirect(from, to, 'Correct! You solved it in' + utils.time_diff(math_game_sessions[from].timestamp) + '.');
        delete math_game_sessions[from];
    } else if(--math_game_sessions[from].tries == 0) {
        bot.sayDirect(from, to, 'Incorrect! Out of tries, answer: ' + math_game_sessions[from].answer + '.');
        delete math_game_sessions[from];
    } else {
        bot.sayDirect(from, to, 'Incorrect! You have ' + math_game_sessions[from].tries + ' tries left.');
    }
}
