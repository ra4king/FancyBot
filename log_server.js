module.exports = {
    log_request: log_request
};

var htmlencode = require('htmlencode');

function log_request(request, response) {
    var fs = require('fs');

    var param = require('url').parse(request.url, true);

    var date_string;
    if(param.query && param.query.date) {
        date_string = param.query.date;
    } else {
        date_string = dateToString(new Date());
    }

    var filename = 'logs/#java-gaming.' + date_string + '.log';

    fs.readFile(filename, function(err, data) {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');

        try {
            var lines = err ? null : data.toString().split('\n');

            var body;
            if(param.query && param.query.type === 'json') {
                body = generateJSON(date_string, lines, response);
            } else {
                body = generateHTML(date_string, lines, response);
            }

            response.writeHead(200);
            response.end(body);
        } catch(e) {
            response.writeHead(500);
            response.end('Internal error: ' + e);
        }
    });
}

function dateToString(date) {
    function left_pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    return date.getUTCFullYear() + '-' + left_pad(date.getUTCMonth()+1) + '-' + left_pad(date.getUTCDate());
}

function generateHTML(date_string, lines) {
    var title = lines === null ? '' : htmlencode.htmlEncode(date_string);

    var d = new Date(date_string);
    d.setUTCDate(d.getUTCDate() - 1);
    var prev_date = dateToString(d);
    d.setUTCDate(d.getUTCDate() + 2)
    var next_date = dateToString(d);

    var prev_date_html = '<a id="prev_date" href="?date=' + prev_date + '">' + htmlencode.htmlEncode('<-- ' + prev_date) + '</a>';
    var next_date_html = '<a id="next_date" href="?date=' + next_date + '">' + htmlencode.htmlEncode(next_date + ' -->') + '</a>';
    var prev_next_date_html = '     <div>' + prev_date_html + next_date_html + '</div><br/>\n';

    var html = '';
    html += '<html>\n';
    html += '   <head>\n';
    html += '       <title>#java-gaming logs ' + title + '</title>\n';
    html += '       <style> body { line-height: 1.3em; background-color: #0C1010; color: #008000; font-family: "Consolas", "Source Code Pro", "Andale Mono", "Monaco", "Lucida Console", monospace; }\n';
    html += '               a { color: #68A4DE; text-decoration: none; } a:hover { text-decoration: underline; } #prev_date { float: left; } #next_date { float: right; }\n'
    html += '               .msg { color: #FFFFFF; } .event { color: #BDB76B; } .nick { color: #DC143C; display: inline-block; text-align: right; min-width: 140px; max-width: 140px; padding-right: 10px; }</style>\n';
    html += '   </head>\n';
    html += '   <body>\n';
    html += '       <h1>#java-gaming logs ' + title + '</h1>\n';
    html += '       <form method="get">\n';
    html += '           <div id="datepicker">Date: <input type="date" name="date"/> <input type="submit" value="Go" id="datego"></div>\n';
    html += '       </form>\n';
    if(lines) {
        html += prev_next_date_html;
        html += '       <hr />\n';

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
        html += '       <hr />\n';
        html += prev_next_date_html;
    } else {
        html += '       <p>No logs found</p>\n';
        var today = dateToString(new Date());
        html += '       <a id="today" href="?date=' + today + '">' + today + '</a>';
    }
    html += '   </body>\n';
    html += '</html>\n';
    return html;
}

function generateJSON(date_string, lines) {
    if(lines === null) {
        return JSON.stringify({
            err: 'no logs'
        });
    }

    var json = {
        date: date_string,
        logs: []
    };

    lines.forEach(function(s) {
        var msg_regex = /^\[(.+?)\]  (?:<(.+?)> )?(.+)$/;
        var match = msg_regex.exec(s);
        if(!match) {
            return;
        }

        json.logs.push({
            timestamp: match[1],
            nick: match[2] ? match[2] : null,
            text: match[3]
        });
    });

    return JSON.stringify(json);
}
