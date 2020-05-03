function arrayFromObjectValues(object) {
  return Object.keys(object).map((key) => object[key]);
}

function decrementMaxMap(map, id) {
  const newCount = map.get(id) - 1;
  if (newCount === 0) {
    map.delete(id);
  } else {
    map.set(id, newCount);
  }
}

function dynamicStrSpaceFill(str, longestStrLen) {
  if (str.length < longestStrLen) {
    let newStr = str;
    for (let i = 0; i < longestStrLen - str.length; i++) {
      newStr = newStr.concat(` ${zeroWidthSpaceChar}`);
    }
    return newStr;
  }
  return str;
}

function getNumberFromArguments(argString, isPositive=false) {
  return getSafe(() => {
    const matches = argString.match(/\d+/);
    if (matches === null) {
      return null;
    }
    const idx = parseInt(matches[0]);
    if (isPositive && idx < 0) {
      return null;
    }
    return idx;
  }, null);
}

function getSafe(fn, defaultVal = null, errCallback = null) {
  try {
    return fn();
  } catch (e) {
    if (errCallback) {
      errCallback(e);
    }
    return defaultVal;
  }
}

function isStaff(guildMember) {
  return guildMember.hasPermission('KICK_MEMBERS') || guildMember.hasPermission('ADMINISTRATOR');
}

function randomFromArray(myArray) {
  return myArray.length > 0
    ? myArray[Math.floor(Math.random() * myArray.length)]
    : null;
}

function randomMusicEmoji() {
  return randomFromArray([..."🎸🎹🎺🎻🎼🎷🥁🎧🎤"]);
}

function retry(fn, retries = 3, err = null) {
  if (!retries) {
    return Promise.reject(err);
  }
  return fn().catch((err) => {
    return retry(fn, retries - 1, err);
  });
}

zeroWidthSpaceChar = "\u200b";

module.exports = {
  arrayFromObjectValues,
  decrementMaxMap,
  dynamicStrSpaceFill,
  getNumberFromArguments,
  getSafe,
  isStaff,
  randomFromArray,
  randomMusicEmoji,
  retry,
  zeroWidthSpaceChar,
};
