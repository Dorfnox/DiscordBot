function randomFromArray(myArray) {
    return myArray.length > 0 ? myArray[Math.floor(Math.random() * myArray.length)] : null;
}

function randomMusicEmoji() {
    return randomFromArray([...'🎸🎹🎺🎻🎼🎷🥁🎧🎤']);
}

module.exports = {
    randomFromArray,
    randomMusicEmoji
}