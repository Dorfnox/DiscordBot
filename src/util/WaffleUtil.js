const { owner, chat } = require("../../configWaffleBot");
const { ownerIds } = owner;
const { cmdCategory } = chat;

// For use with Maps in the form: Map<k>:Set<v>
function addValueToMapSet(map, key, setValue) {
  if (!map.has(key)) {
    return map.set(key, new Set().add(setValue));
  }
  map.get(key).add(setValue);
  return map;
}

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

// For use with Maps in the form: Map<k>:Set<v>
function deleteValueFromMapSet(map, key, setValue) {
  if (!map.has(key)) {
    return map;
  }
  const mySet = map.get(key);
  mySet.delete(setValue);
  if (!mySet.size) {
    map.delete(key);
  }
  return map;
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

function getCategoryCmds(category, subCategory = null) {
  category = category.toLowerCase();
  const categoryObject = cmdCategory.find(
    (cc) => cc.category.toLowerCase() === category
  );
  if (!categoryObject) {
    throw `Missing Category: ${category}`;
  } else if (!subCategory) {
    return categoryObject;
  }
  return getCategorySubCmds(categoryObject, subCategory);
}

function getCategorySubCmds(categoryObject, subCategory) {
  subCategory = subCategory.toLowerCase();
  const subCategoryObject = categoryObject.cmdSubCategory.find(
    (csc) => csc.name.toLowerCase() === subCategory
  );
  if (!subCategoryObject) {
    throw `Missing Sub-category: ${subCategory}`;
  }
  return subCategoryObject;
}

function getNumberFromArguments(argString, isPositive = false) {
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

function isOwner(guildMember) {
  return ownerIds.indexOf(guildMember.user.id) !== -1;
}

function isStaff(guildMember) {
  return (
    !guildMember.user.bot &&
    (guildMember.hasPermission("KICK_MEMBERS") ||
      guildMember.hasPermission("ADMINISTRATOR") ||
      isOwner(guildMember))
  );
}

function jsonCopy(json) {
  return JSON.parse(JSON.stringify(json));
}

function logger(guildName, channelName, username, content, err = null) {
  const readableDate = new Date().toLocaleString();
  setTimeout(() => {
    const logMessage = `\n[${readableDate} | ${guildName}, ${channelName}, ${username}]\n_REQ: ${content}${
      err ? `\n_ERR: ${err}` : ""
    }`;
    console.log(logMessage);
  }, 100);
}

function occurrences(string, subString, allowOverlapping) {
  string += "";
  subString += "";
  if (subString.length <= 0) return string.length + 1;

  var n = 0,
    pos = 0,
    step = allowOverlapping ? 1 : subString.length;

  while (true) {
    pos = string.indexOf(subString, pos);
    if (pos >= 0) {
      ++n;
      pos += step;
    } else break;
  }
  return n;
}

function paginateArray(myArray, page, pageSize) {
  return myArray.slice(pageSize * (page - 1), pageSize * page);
}

function randomFromArray(myArray) {
  return myArray.length > 0
    ? myArray[Math.floor(Math.random() * myArray.length)]
    : null;
}

function randomMusicEmoji() {
  return randomFromArray([..."🎸🎹🎺🎻🎼🎷🥁🎧🎤"]);
}

function randomWaffleColor() {
  return randomFromArray(waffleColorSpectrum);
}

function retry(fn, retries = 3, timeoutMilliseconds = 0, err = null) {
  return fn().catch(
    (err) =>
      new Promise((resolve, reject) => {
        if (!--retries) {
          reject(err);
        }
        const run = () =>
          retry(fn, retries, timeoutMilliseconds, err).then((res) => {
            resolve(res);
          });
        return timeoutMilliseconds
          ? setTimeout(run, timeoutMilliseconds)
          : run();
      })
  );
}

function roundToTwo(num) {    
  return +(Math.round(num + "e+2")  + "e-2");
}

function sendChannel(
  channel,
  embed,
  { guildName = "...", username = "...", content = "", err = null }
) {
  const sendable =
    typeof embed === "string"
      ? embed
      : {
          embed: Object.assign(
            {
              color: randomWaffleColor(),
            },
            { ...embed }
          ),
        };
  // Send to channel
  return channel
    .send(sendable)
    .then((sentMsg) => {
      logger(guildName, channel.name, username, content, err);
      return sentMsg;
    })
    .catch((err) => {
      logger(guildName, channel.name, username, content, err);
    });
}

function timeoutPromise(timeoutInMilliseconds, dataToPass = null) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(dataToPass), timeoutInMilliseconds);
  });
}

zeroWidthSpaceChar = "\u200b";

waffleColorSpectrum = [
  0x8b5f2b,
  0x986c33,
  0xa5793d,
  0xb08646,
  0xbb9351,
  0xc69d4e,
  0xd0a74b,
  0xd9b249,
  0xe2be47,
  0xebca46,
  0xf3d745,
];

module.exports = {
  addValueToMapSet,
  arrayFromObjectValues,
  decrementMaxMap,
  deleteValueFromMapSet,
  dynamicStrSpaceFill,
  getCategoryCmds,
  getCategorySubCmds,
  getNumberFromArguments,
  getSafe,
  isOwner,
  isStaff,
  jsonCopy,
  logger,
  occurrences,
  paginateArray,
  randomFromArray,
  randomMusicEmoji,
  randomWaffleColor,
  retry,
  roundToTwo,
  sendChannel,
  timeoutPromise,
  waffleColorSpectrum,
  zeroWidthSpaceChar,
};
