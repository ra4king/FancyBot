module.exports = {
    log_request: log_request
};

var htmlencode = require('htmlencode');

var path = '/jgo-logs';
var channel = '#java-gaming';

function log_request(request, response) {
    var fs = require('fs');

    var param = require('url').parse(request.url, true);

    var request_file = param.pathname.substring(path.length).replace(/\//g, '').trim();
    if(request_file) {
        fs.readFile(request_file, function(err, data) {
            if(err) {
                response.writeHead(404);
                response.end('File not found.');
            } else {
                response.writeHead(200);
                response.end(data);
            }
        });
    } else {
        var date_string = dateToString(new Date());
        var queried_today;
        if(param.query && param.query.date) {
            queried_today = date_string === param.query.date;
            date_string = param.query.date;
        } else {
            queried_today = true;
        }

        var filename = 'logs/' + channel + '.' + date_string + '.log';

        fs.readFile(filename, function(err, data) {
            try {
                var lines = err ? (queried_today ? [] : null) : data.toString().split('\n');

                var body;
                if(param.query && param.query.type === 'json') {
                    response.setHeader('Content-Type', 'application/json; charset=utf-8');
                    body = generateJSON(date_string, lines, response);
                } else {
                    response.setHeader('Content-Type', 'text/html; charset=utf-8');
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
    var today_html = '<a id="today" href="?">' + dateToString(new Date()) + '</a>';
    var next_date_html = Date.parse(next_date) - Date.now() > 0 ? '<div id="next_date"></div>' : '<a id="next_date" href="?date=' + next_date + '">' + htmlencode.htmlEncode(next_date + ' -->') + '</a>';
    var prev_next_date_html = '     <div>' + prev_date_html + today_html + next_date_html + '</div>\n';

    var html = '';
    html += '<html>\n';
    html += '   <head>\n';
    html += '       <title>' + channel + ' logs ' + title + '</title>\n';
    html += '       <link rel="stylesheet" href="/jgo-logs/log_viewer.css" />\n';
    html += '   </head>\n';
    html += '   <body>\n';
    html += '       <h1>' + channel + ' logs ' + title + '</h1>\n';
    html += '       <form method="get">\n';
    html += '           <div id="datepicker">Date: <input type="date" name="date"/> <input type="submit" value="Go" id="datego"></div>\n';
    html += '       </form>\n';
    if(lines) {
        html += prev_next_date_html;
        html += '       <hr />\n';

        lines.forEach(function(s) {
            var msg_regex = /^(\[.+?\])  (<.+?> |\* )?(.+)$/;
            var match = msg_regex.exec(s);
            if(!match) {
                return;
            }

            html += '       <div class="row"><span class="datestring">' + htmlencode.htmlEncode(match[1]) + '</span>  ';

            var msg_class = 'msg';

            if(match[2]) {
                html += '<span class="nick">' + htmlencode.htmlEncode(match[2]) + '</span>';
            } else {
                msg_class = 'event';
            }

            var url_regex = /(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?/g;

            var msg = match[3];

            var tldjs = require('tldjs');

            var line = '';
            var result;
            while(result = url_regex.exec(msg)) {
                if(result.index > 0) {
                    line += htmlencode.htmlEncode(msg.substring(0, result.index));
                }

                var url_result = result[0];

                if(!tldjs.tldExists(url_result) || !tldjs.isValid(url_result)) {
                    line += htmlencode.htmlEncode(url_result);
                } else {
                    line += '<a target="_blank" href="' + (result[1] ? '' : 'http://') + url_result + '">' + htmlencode.htmlEncode(url_result) + '</a>';
                }

                msg = msg.substring(result.index + url_result.length);
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
