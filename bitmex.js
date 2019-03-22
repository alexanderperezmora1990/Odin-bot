if (!Array.prototype.includes) {
    require('core-js/fn/array/includes')
}

const request = require('./request')

function getCurrentPriceBtc() {

    return request('/orderBook/L2?symbol=XBT')


}


module.exports = {
    getCurrentPriceBtc
}