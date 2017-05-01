module.exports = {
    init: init,
};

function init(action, utils, config) {
    action({name: '_'}, no_command);

    var options = {
        name: 'blacklist',
        list_name: 'url_blacklist',
        element_name: 'url',
        help: 'Manage URL title-grabber blacklist.',
        op_only: true,
        split_token: /\s/g,
    };
    utils.create_list_action(action, options);
}

function no_command(bot, from, to, text, message, utils, config) {
    var off_log = text[0] === '-' ? '- ' : '';

    var url_regex = /(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?/g;

    var result;
    while((result = url_regex.exec(text)) != null) {
        console.log('Detected URL: ' + result[0]);

        var url_result = result[0];

        if(result[1] === undefined) {
            url_result = 'http://' + url_result;
        }

        var tldjs = require('tldjs');
        if(!tldjs.tldExists(url_result) || !tldjs.isValid(url_result)) {
            console.log('Not a valid URL or TLD');
            continue;
        }

        function get_title(url) {
            console.log('Retrieving title for ' + url);

            try {
                var parsed_url = require('url').parse(url);

                if(config.url_blacklist) {
                    var lc_url = parsed_url.hostname.toLowerCase();

                    if(config.url_blacklist.findIndex(function(value) {
                        if(value === lc_url) {
                            return true;
                        } else if(value.indexOf('*') != -1) {
                            var regex = new RegExp('^' + value.replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").replace(/[*]/g, '.*') + '$');
                            return regex.test(lc_url);
                        }

                        return false;
                    }) != -1) {
                        console.log('Matched blacklist entry.');
                        return;
                    }
                }

                var protocol = parsed_url.protocol === 'https:' ? require('https') : require('http');

                parsed_url.method = 'HEAD';

                var req = protocol.request(parsed_url, function(head_response) {
                    if(head_response.statusCode == 200) {
                        var content_type = head_response.headers['Content-Type'] || head_response.headers['content-type'];
                        if(!content_type || content_type.indexOf('text/html') === -1) {
                            console.log('Content not HTML for ' + url);
                            return;
                        }

                        parsed_url.method = undefined;
                        var req = protocol.get(parsed_url, function(response) {
                            var data = '';
                            var found = false;

                            function test_title() {
                                var title_regex = /<\s*title.*?>([\s\S]+?)</mi;
                                var title = title_regex.exec(data);

                                if(title && title[1]) {
                                    title = title[1].replace(/\r\n|\r|\n/g, ' ');

                                    var htmlencode = require('htmlencode');

                                    console.log('URL Title: ' + title);
                                    bot.say(to === bot.nick ? from : to, off_log + htmlencode.htmlDecode(title.trim()) + ' - ' + parsed_url.protocol + '//' + parsed_url.hostname);

                                    found = true;
                                    req.abort();
                                }
                            }

                            response.on('data', function(chunk) {
                                data += chunk.toString();
                                if(!found)
                                    test_title();
                            });
                            response.on('end', function() {
                                if(!found)
                                    test_title();
                            });
                        });
                        req.on('error', function(err) {
                            console.log('Could not reach ' + url + ': ' + err.message);
                        });
                        req.end();
                    } else if(Math.floor(head_response.statusCode / 100) == 3) {
                        console.log('Got redirect (' + head_response.statusCode + ') for ' + url);
                        if(head_response.headers.location && new RegExp(url_regex).test(head_response.headers.location)) {
                            get_title(head_response.headers.location);
                        } else {
                            get_title(parsed_url.protocol + '//' + parsed_url.hostname + head_response.headers.location);
                        }
                    } else {
                        console.log('Got status ' + head_response.statusCode + ' for ' + url);
                    }
                });
                req.on('error', function(err) {
                    console.log('Could not reach ' + url + ': ' + err.message);
                });
                req.end();
            } catch(e) {
                console.log('Could not parse ' + url);
            }
        };

        get_title(url_result);
    }
}
