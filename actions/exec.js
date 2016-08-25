module.exports = {
    init: init,
};

function init(action, utils, config) {
    utils.globals.exec_context = {};

    var exec_options = {
        name: 'exec',
        help: 'Usage: !exec print("Hello, world!"). Evaluates a javascript expression.',
        op_only: true,
        help_on_empty: true,
    };

    action(exec_options, exec);

    var calc_options = {
        name: 'calc',
        help: 'Usage: !calc 4 + 5. Same as !eval. Evaluates and prints a javascript expression.',
        op_only: true,
        help_on_empty: true,
    };

    action(calc_options, function(bot, from, to, text, message, utils, config) {
        exec(bot, from, to, text, message, utils, config, true);
    });

    var eval_options = {
        name: 'eval',
        help: 'Usage: !eval 4 + 5. Same as !calc. Evaluates and prints a javascript expression.',
        op_only: true,
        help_on_empty: true,
    };

    action(eval_options, function(bot, from, to, text, message, utils, config) {
        exec(bot, from, to, text, message, utils, config, true);
    });
}

function exec(bot, from, to, text, message, utils, config, is_calc) {
    if(is_calc) {
        console.log('calc: ' + text);

        if(text.indexOf(';') != -1 || text.indexOf('}') != -1) {
            console.log('Detected semicolon or curly brace.');
            bot.sayDirect(from, to, 'No statements allowed.');
            return;
        }

        text = 'print(' + text + ')';
    } else {
        console.log('exec: ' + text);
    }

    try {
        var exec_context = utils.globals.exec_context;
        
        var output = '';
        exec_context.print = function(text) {
            output += text + ' ';
        };
        exec_context.print.toString = function() {
            throw new Error('cannot print a function');
        };
        // These overrides can be undone using delete
        // exec_context.eval = undefined;
        // exec_context.Promise = undefined;
        // exec_context.Function = undefined;

        require('vm').runInNewContext(text, exec_context, { 'timeout': 1000 });

        if(output.length > 255) {
            bot.sayDirect(from, to, 'Too much output');
        } else if(!output) {
            bot.sayDirect(from, to, 'No output');
        } else {
            output = output.replace(/\n/g, ' ').replace(/ +/, ' ');
            bot.sayDirect(from, to, output);

            if(is_calc) {
                exec_context['_'] = output;
            }
        }
    } catch(e) {
        bot.sayDirect(from, to, 'Error: ' + e.message);
    }
}
