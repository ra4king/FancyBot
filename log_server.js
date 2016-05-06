module.exports = {
	log_request: log_request
};

function log_request(request, response) {
	var fs = require('fs');

	fs.readFile('#java-gaming.2016-05-06.log', function(err, data) {
		if(err) {
			console.error('Error loading logs: ' + err);
			return;
		}

		response.writeHead(200);
		response.end(data.toString());
	});
}
