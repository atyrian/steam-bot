var bodyParser = require('body-parser');
var express = require('express');
var path = require('path');
var steam = require('steam');
var app = express();

var DEFAULT_PORT = 1337;
var port = '';

if (!process.env.port) {
    port = DEFAULT_PORT;
}   else {
    port = process.env.port;
}

app.use(bodyParser());
app.use(express.static(path.join(__dirname, './public')));

app.listen(port, () => {
    console.log('Server listening on port: ', port);
});