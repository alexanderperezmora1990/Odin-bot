'use strict';

var rp = require('request-promise');

var baseUrl = 'https://www.bitmex.com/api/v1';


function request(path, qs) {
    return rp({ uri: '' + baseUrl + path, qs: qs, json: true });
}

module.exports = request;