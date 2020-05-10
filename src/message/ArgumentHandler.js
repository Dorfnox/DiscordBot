const { prefixes } = require("../../configWaffleBot").chat;

class ArgumentHandler {
  static removeArgs(argString, numArgsToRemove) {
    return argString
      .split(/\s/g)
      .filter((i) => i)
      .slice(numArgsToRemove)
      .join(" ");
  }

  static argStrToArray(argString) {
    return argString.split(/\s/g).filter((i) => i);
  }

  constructor(prefixArray = prefixes) {
    this.argMap = new Map();
    this.lengthArray = [];
    this.prefixSet = new Set(prefixArray);
  }

  addCmds(args, value = null) {
    if (!Array.isArray(args)) {
      return this.addCmd(args);
    }
    args.forEach((a) => this.addCmd(a, value));
    return this;
  }

  // A command can be a string 'example' or multiple words 'this should all be executable'
  addCmd(cmd, cmdValue = null) {
    const args = cmd.split(/\s/g).filter((item) => item);
    if (!this.argMap.has(args.length)) {
      // Set argMap to: Map<argsLen, Map<cmd, value>>
      this.argMap.set(args.length, new Map());
      this.lengthArray.push(args.length);
      this.lengthArray.sort((a, b) => a - b);
    }
    // Returns a Map<cmd, value>
    const cmdMap = this.argMap.get(args.length);
    const key = args.map((a) => a.replace(/\s/g, "").toLowerCase()).join("_");
    if (cmdMap.has(key)) {
      throw `Arguments must be unique. ${key} is duplicated!`;
    }
    cmdMap.set(key, cmdValue);
    return this;
  }

  // Optionally, returns the length of how many arguments in the string were parsed.
  parseArguments(argArray, includesPrefix = false) {
    const result = { parseLength: 0, exists: false, value: undefined };
    if (!argArray || !argArray.length) {
      return result;
    }
    if (!Array.isArray(argArray)) {
      argArray = argArray.split(/\s/g);
    }
    argArray = argArray.filter((i) => i).map((a) => a.toLowerCase());
    if (includesPrefix) {
      if (!this.hasPrefix(argArray[0])) {
        return result;
      }
      argArray = argArray.slice(1);
      result.parseLength += 1;
    }

    // Parse from lowest -> highest (greedy match)
    this.lengthArray.some((l) => {
      const key = argArray.slice(0, l).join("_");
      const cmdMap = this.argMap.get(l);
      result.exists = cmdMap.has(key);
      result.value = cmdMap.get(key);
      result.parseLength += result.exists ? l : 0;
      return result.exists;
    });
    return result;
  }

  hasPrefix(argArray) {
    if (!argArray || !argArray.length) {
      return false;
    } else if (!Array.isArray(argArray)) {
      argArray = argArray.split(/\s/g);
    }
    const prefix = argArray.filter((i) => i)[0];
    return this.prefixSet.has(prefix ? prefix.toLowerCase() : null);
  }
}

module.exports = ArgumentHandler;
