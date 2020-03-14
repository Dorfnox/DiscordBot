function decrementMaxMap(map, id) {
    const newCount = map.get(id) - 1;
    if (newCount === 0) {
        map.delete(id);
    } else {
        map.set(id, newCount);
    }
}

function randomFromArray(myArray) {
    return myArray.length > 0 ? myArray[Math.floor(Math.random() * myArray.length)] : null;
}

function randomMusicEmoji() {
    return randomFromArray([...'🎸🎹🎺🎻🎼🎷🥁🎧🎤']);
}

module.exports = {
    decrementMaxMap,
    randomFromArray,
    randomMusicEmoji
}