module.exports = {
    log_request: log_request
};

var htmlencode = require('htmlencode');

function log_request(request, response) {
    var fs = require('fs');

    function left_pad(s) {
        return (s < 10 ? '0' : '') + s;
    }

    var param = require('url').parse(request.url);

    var date_string;
    if(param.query) {
        date_string = param.query;
    } else {
        var date = new Date();
        date_string = date.getUTCFullYear() + '-' + left_pad(date.getUTCMonth()+1) + '-' + left_pad(date.getUTCDate());
    }

    var filename = 'logs/#java-gaming.' + date_string + '.log';

    fs.readFile(filename, function(err, data) {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');

        if(err) {
            response.writeHead(200);
            response.end();
            return;
        }

        try {
            var lines = data.toString().split('\n');

            var html = '';
            html += '<html>\n';
            html += '   <head>\n';
            html += '       <title>#java-gaming logs ' + htmlencode.htmlEncode(date_string) + '</title>\n';
            html += '       <style> body { line-height: 1.3em; background-color: #0C1010; color: #008000; font-family: "Consolas", "Source Code Pro", "Andale Mono", "Monaco", "Lucida Console", monospace; }\n';
            html += '               a { color: #68A4DE; text-decoration: none; } a:hover { text-decoration: underline; }\n'
            html += '               .msg { color: #FFFFFF; } .event { color: #BDB76B; } .nick { color: #DC143C; display: inline-block; text-align: right; min-width: 140px; max-width: 140px; padding-right: 10px; }</style>\n';
            html += '   </head>\n';
            html += '   <body>\n';
            html += '       <h1>#java-gaming logs ' + htmlencode.htmlEncode(date_string) + '</h1>\n';
            lines.forEach(function(s) {
                var msg_regex = /^(\[.+?\])  (<.+?> )?(.+)$/;
                var match = msg_regex.exec(s);
                if(!match) {
                    return;
                }

                html += '       <div><span class="datestring">' + htmlencode.htmlEncode(match[1]) + '</span>  ';

                var msg_class = 'msg';

                if(match[2]) {
                    html += '<span class="nick">' + htmlencode.htmlEncode(match[2]) + '</span>';
                } else {
                    msg_class = 'event';
                }

                var url_regex = /(https?\:\/\/)(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?/g;
                var msg = match[3];

                var line = '';
                var result;
                while(result = url_regex.exec(msg)) {
                    if(result.index > 0) {
                        line += htmlencode.htmlEncode(msg.substring(0, result.index));
                    }

                    line += '<a href="' + result[0] + '">' + htmlencode.htmlEncode(result[0]) + '</a>';
                    msg = msg.substring(result.index + result[0].length);
                }

                if(msg.length > 0) {
                    line += htmlencode.htmlEncode(msg);
                }

                html += '<span class="' + msg_class + '">' + line + '</span></div>\n';
            });
            html += '   </body>\n';
            html += '</html>\n';

            response.writeHead(200);
            response.end(html);
        } catch(e) {
            response.writeHead(500);
            response.end('Internal error: ' + e);
        }
    });
}
