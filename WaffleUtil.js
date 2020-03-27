function arrayFromObjectValues(object) {
    return Object.keys(object).map(key => object[key]);
}

function decrementMaxMap(map, id) {
    const newCount = map.get(id) - 1;
    if (newCount === 0) {
        map.delete(id);
    } else {
        map.set(id, newCount);
    }
}

function getSafe(fn, defaultVal = null) {
    try {
        return fn();
    } catch (e) {
        return defaultVal;
    }
}

function randomFromArray(myArray) {
    return myArray.length > 0 ? myArray[Math.floor(Math.random() * myArray.length)] : null;
}

function randomMusicEmoji() {
    return randomFromArray([...'🎸🎹🎺🎻🎼🎷🥁🎧🎤']);
}

zeroWidthSpaceChar = '\u200b';

module.exports = {
    arrayFromObjectValues,
    decrementMaxMap,
    getSafe,
    randomFromArray,
    randomMusicEmoji,
    zeroWidthSpaceChar
}