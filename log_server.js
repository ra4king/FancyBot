var log_server_port = 8000;

require('http').createServer(log_request).listen(log_server_port, function() {
    console.log('Log server ready on port ' + log_server_port);
});

var htmlencode = require('htmlencode');

var path = '/jgo-logs';
var channel = '#java-gaming';
var min_date = '2015-03-25';

function log_request(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');

    var fs = require('fs');

    var param = require('url').parse(request.url, true);

    var request_file = param.pathname.substring(path.length).replace(/\//g, '').trim();
    if(request_file) {
        if(request_file.endsWith('.css')) {
            fs.readFile(request_file, function(err, data) {
                if(err) {
                    response.writeHead(404);
                    response.end('File not found.');
                } else {
                    response.writeHead(200, {
                        'Content-Length': Buffer.byteLength(data),
                        'Content-Type': 'text/css' });
                    response.end(data);
                }
            });
        } else {
            response.writeHead(404);
            response.end('File not found.');
        }
    } else if(param.query.search) {
        var query = param.query.search;

        if(param.query.regex !== "true") {
            query = query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        }

        try {
            new RegExp(query, 'ig');
        } catch(e) {
            response.writeHead(400);
            response.end('Invalid regex `' + query + '`: ' + e);
            return;
        }

        fs.readdir('logs/', (err, files) => {
            if(err) {
                console.error('Error reading logs directory');
                console.error(err);

                response.writeHead(500);
                response.end('Internal error: ' + err);
                return;
            }

            var hasResponded = false;

            var found = [];
            var visited = 0;
            var MAX_RESULTS = 1000;

            files.forEach((file) => {
                if(!file.startsWith(channel)) {
                    visited++;
                    return;
                }

                fs.readFile('logs/' + file, (err, data) => {
                    visited++;

                    if(hasResponded) {
                        return;
                    }

                    if(err) {
                        hasResponded = true;
                        console.error('Error reading file: ' + file);
                        console.error(err);
                        response.writeHead(500);
                        return response.end('Internal error: ' + err);
                    }

                    try {
                        try {
                            require('vm').runInNewContext(
                                `var currIdx = 0;
                                lines.forEach(line => {
                                    var search;
                                    if((search = new RegExp(query, 'ig').exec(line))) {
                                        found.push([ file, currIdx + search.index, line.trim() ]);
                                    }

                                    currIdx += line.length + 1;
                                });`, { lines: data.toString().split('\n'), query: query, file: file, found: found }, { timeout: 100 });
                        } catch(e) {
                            console.log(e);

                            hasResponded = true;
                            response.writeHead(400);
                            response.end('Regex timed out.');
                            return;
                        }

                        if(found.length > MAX_RESULTS) {
                            found.splice(0, found.length - MAX_RESULTS);
                        }

                        if(visited == files.length) {
                            found.sort((a, b) => {
                                var msg_regex = /^\[(.+?)\].+$/;
                                var matchA = msg_regex.exec(a[2]);
                                if(!matchA) {
                                    return -1;
                                }

                                var msg_regex = /^\[(.+?)\].+$/;
                                var matchB = msg_regex.exec(b[2]);
                                if(!matchB) {
                                    return 1;
                                }

                                return new Date(matchB[1]) - new Date(matchA[1]);
                            });

                            hasResponded = true;

                            var body;
                            if(param.query && param.query.type === 'json') {
                                response.setHeader('Content-Type', 'application/json; charset=utf-8');
                                body = generateSearchJSON(param.query.search, param.query.regex, found);
                            } else {
                                response.setHeader('Content-Type', 'text/html; charset=utf-8');
                                body = generateSearchHTML(param.query.search, param.query.regex, found);
                            }

                            response.writeHead(200, { 'Content-Length': Buffer.byteLength(body) });
                            response.end(body);
                        }
                    } catch(err) {
                        hasResponded = true;
                        response.writeHead(500);
                        response.end('Internal error: ' + err);
                    }
                });
            });
        });
    } else {
        var date_string = dateToString(new Date());
        var queried_today;
        if(param.query.date) {
            queried_today = date_string === param.query.date;
            date_string = param.query.date;
        } else {
            queried_today = true;
        }

        var filename = 'logs/' + channel + '.' + date_string + '.log';

        fs.readFile(filename, (err, data) => {
            try {
                var lines = err ? (queried_today ? [] : null) : data.toString().split('\n');

                var body;
                if(param.query && param.query.type === 'json') {
                    response.setHeader('Content-Type', 'application/json; charset=utf-8');
                    body = generateLogsJSON(date_string, lines);
                } else {
                    response.setHeader('Content-Type', 'text/html; charset=utf-8');
                    body = generateLogsHTML(date_string, lines, Number(param.query.mark) || -1);
                }

                response.writeHead(200, { 'Content-Length': Buffer.byteLength(body) });
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

function generateLogsHTML(date_string, lines, highlight) {
    var date_string_html = htmlencode.htmlEncode(date_string);
    var title = lines === null ? '' : date_string_html;

    var d = new Date(date_string);
    d.setUTCDate(d.getUTCDate() - 1);
    var prev_date = dateToString(d);
    d.setUTCDate(d.getUTCDate() + 2)
    var next_date = dateToString(d);

    var prev_date_html = Date.parse(prev_date) - Date.parse(min_date) >= 0 ? '<a class="prev_date" href="?date=' + prev_date + '">' + htmlencode.htmlEncode('<-- ' + prev_date) + '</a>' : '<div class="prev_date"></div>';
    var today_html = '<a class="today" href="?"></a>';
    var next_date_html = Date.parse(next_date) - Date.now() > 0 ? '<div class="next_date"></div>' : '<a class="next_date" href="?date=' + next_date + '">' + htmlencode.htmlEncode(next_date + ' -->') + '</a>';
    var prev_next_date_html = '     <nav>' + prev_date_html + today_html + next_date_html + '</nav>\n';

    var html = '<!DOCTYPE html>';
    html += '<html>\n';
    html += '   <head>\n';
    html += '       <title>' + channel + ' logs ' + title + '</title>\n';
    html += '       <link rel="stylesheet" type="text/css" href="/jgo-logs/log_viewer.css" />\n';
    html += '       <script>\n';
    html += '           window.onload = function() {\n';
    html += '               function updateToday() { [].forEach.call(document.getElementsByClassName("today"), function(elem) { elem.innerHTML = new Date().toGMTString(); }); }\n';
    html += '               updateToday();'
    html += '               setInterval(updateToday, 1000);\n';
    html += '           };\n';
    html += '       </script>\n';
    html += '   </head>\n';
    html += '   <body>\n';
    html += '       <h1>' + channel + ' logs ' + title + '</h1>\n';
    html += '       <div id="header">'
    html += '           <form id="datepicker" method="get">\n';
    html += '               Date: <input type="date" name="date" min="' + min_date + '" value="' + date_string_html + '"/>\n';
    html += '               <input type="submit" value="Go" id="datego" />\n';
    html += '           </form>\n';
    html += '           <form id="search" method="get">\n';
    html += '               <label>Search: <input type="text" name="search" /></label>\n';
    html += '               <label>Use regex: <input type="checkbox" name="regex" value="true" /></label>\n';
    html += '               <input type="submit" value="Go" id="searchgo" />\n';
    html += '          </form>\n';
    html += '       </div>\n';
    if(lines) {
        html += prev_next_date_html;
        html += '       <hr />\n';

        var currIdx = 0;
        lines.forEach(function(s) {
            var mark = highlight >= currIdx && highlight < currIdx + s.length + 1;
            currIdx += s.length + 1;

            var msg_regex = /^(\[.+?\])  ([<-].+?[>-] |\* )?(.+)$/;
            var match = msg_regex.exec(s);
            if(!match) {
                return;
            }

            html += '       <div ' + (mark ? 'id="mark" ' : '') + 'class="row"><div class="datestring">' + htmlencode.htmlEncode(match[1]) + '</div>';

            var msg_class = 'msg';

            if(match[2]) {
                html += '<div class="nick">' + htmlencode.htmlEncode(match[2]) + '</div>';
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

            html += '<div class="' + msg_class + '">' + line + '</div></div>\n';
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

function generateLogsJSON(date_string, lines) {
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
        var msg_regex = /^\[(.+?)\]  (?:([<-])(.+?)[>-] )?(.+)$/;
        var match = msg_regex.exec(s);
        if(!match) {
            return;
        }

        json.logs.push({
            timestamp: match[1],
            nick: match[3] ? match[3] : null,
            text: match[4],
            notice: match[2] === '-' ? true : undefined,
        });
    });

    return JSON.stringify(json);
}

function generateSearchHTML(search, regex, found) {
    var html = '<!DOCTYPE html>';
    html += '<html>\n';
    html += '   <head>\n';
    html += '       <title>' + channel + ' logs - Search results</title>\n';
    html += '       <link rel="stylesheet" type="text/css" href="/jgo-logs/log_viewer.css" />\n';
    html += '   </head>\n';
    html += '   <body>\n';
    html += '       <h1>Search results</h1>\n';
    html += '       <div id="header">\n';
    html += '           <p>Search query: ' + htmlencode.htmlEncode(search) + '</p>\n';
    html += '           <form id="search" method="get">\n';
    html += '               <label>Search: <input type="text" name="search" value="' + htmlencode.htmlEncode(search) + '" /></label>\n';
    html += '               <label>Use regex: <input type="checkbox" name="regex" value="true" ' + (regex === 'true' ? 'checked' : '') + ' /></label>\n';
    html += '               <input type="submit" value="Go" id="searchgo" />\n';
    html += '          </form>\n';
    html += '       </div>\n';
    if(found.length > 0) {
        html += '       <ol>\n';

        found.forEach(result => {
            var file = result[0];
            var date = file.substring(channel.length + 1, channel.length + 1 + min_date.length);
            html += '           <li>\n';
            html += '               <div><a href="?date=' + date + '&mark=' + result[1] + '#mark">' + htmlencode.htmlEncode(file) + '</a></div>\n';

            var line = result[2];

            var msg_regex = /^(\[.+?\])  ([<-].+?[>-] |\* )?(.+)$/;
            var match = msg_regex.exec(line);
            if(!match) {
                html += '                   <div>' + htmlencode.htmlEncode(line) + '</div>\n';
            } else {
                html += '       <div class="row"><div class="datestring">' + htmlencode.htmlEncode(match[1]) + '</div>';

                var msg_class = 'msg';

                if(match[2]) {
                    html += '<div class="nick">' + htmlencode.htmlEncode(match[2]) + '</div>';
                } else {
                    msg_class = 'event';
                }

                var url_regex = /(https?\:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?/g;

                var msg = match[3];

                var tldjs = require('tldjs');

                var line = '';
                var url;
                while(url = url_regex.exec(msg)) {
                    if(url.index > 0) {
                        line += htmlencode.htmlEncode(msg.substring(0, url.index));
                    }

                    var url_result = url[0];

                    if(!tldjs.tldExists(url_result) || !tldjs.isValid(url_result)) {
                        line += htmlencode.htmlEncode(url_result);
                    } else {
                        line += '<a target="_blank" href="' + (url[1] ? '' : 'http://') + url_result + '">' + htmlencode.htmlEncode(url_result) + '</a>';
                    }

                    msg = msg.substring(url.index + url_result.length);
                }

                if(msg.length > 0) {
                    line += htmlencode.htmlEncode(msg);
                }

                html += '<div class="' + msg_class + '">' + line + '</div></div>\n';
            }

            html += '               <hr />\n';
            html += '           </li>\n';
        });

        html += '       </ol>\n';
    } else {
        html += '       <p>No results found</p>\n';
    }

    html += '   </body>\n';
    html += '</html>\n';

    return html;
}

function generateSearchJSON(search, regex, found) {
    return JSON.stringify({
        search: search,
        regex: regex,
        results: found.map((result) => {
            var date = result[0].substring(channel.length + 1, channel.length + 1 + min_date.length);

            return {
                date: date,
                line: result[2],
                url: path + '?date=' + date + '&mark=' + result[1] + '#mark'
            };
        })
    });
}
