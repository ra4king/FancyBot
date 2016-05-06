module.exports = {
    log_request: log_request
};

function log_request(request, response) {
    var fs = require('fs');

    function left_pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    
    var date = new Date();
    var filename = '#java-gaming' + '.' + date.getUTCFullYear() + '-' + left_pad(date.getUTCMonth()+1) + '-' + left_pad(date.getUTCDate()) + '.log';
    fs.readFile(filename, function(err, data) {
        if(err) {
            response.writeHead(200);
            response.end();
            return;
        }

        response.writeHead(200);
        response.end(data.toString());
    });
}
