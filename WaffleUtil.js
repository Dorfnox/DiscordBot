const Discord = require('discord.js');
const wafflePic = 'https://storcpdkenticomedia.blob.core.windows.net/media/recipemanagementsystem/media/recipe-media-files/recipes/retail/x17/2020_belgian-style-waffles_16700_760x580.jpg?ext=.jpg'
// const wafflePic = new Discord.Attachment('./assets/waffle1.png');

function getEmbeddedMessage(options = {}) {
    // Waffle colour spectrums
    const colors = [0x8B5F2B, 0x986C33, 0xA5793D, 0xB08646, 0xBB9351, 0xC69D4E, 0xD0A74B, 0xD9B249, 0xE2BE47, 0xEBCA46, 0xF3D745];
    const defaultOptions = {
        color: colors[Math.floor(Math.random() * colors.length)],
        author: {
            name: '',
        },
        description: 'yooo',
    }
    return { embed: Object.assign(defaultOptions, options) };
    //https://i.ytimg.com/vi/paZ2PaXdpGw/hqdefault.jpg
}

function randomFromArray(myArray) {
    return myArray.length > 0 ? myArray[Math.floor(Math.random() * myArray.length)] : null;
}

module.exports = {
    getEmbeddedMessage,
    randomFromArray,
}