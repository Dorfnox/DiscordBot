const { prefixes } = require("../../configWaffleBot").chat;
const { getCategoryCmds } = require("../util/WaffleUtil");

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

  addCmds(args, value = null, concatenatable = false) {
    if (!Array.isArray(args)) {
      return this.addCmd(args, value, concatenatable);
    }
    args.forEach((a) => this.addCmd(a, value, concatenatable));
    return this;
  }

  // A command can be a string 'example' or multiple words 'this should all be executable'
  addCmd(cmd, cmdValue = null, concatenatable = false) {
    const argArray = cmd
      .split(/\s/g)
      .filter((item) => item)
      .map((item) => item.toLowerCase());
    if (!this.argMap.has(argArray.length)) {
      // Set argMap to: Map<argsLen, Map<cmd, value>>
      this.argMap.set(argArray.length, new Map());
      this.lengthArray.push(argArray.length);
      this.lengthArray.sort((a, b) => a - b);
    }
    // Returns a Map<cmd, value>
    const cmdMap = this.argMap.get(argArray.length);
    const key = argArray.join(" ");
    if (cmdMap.has(key)) {
      throw `Arguments must be unique. ${key} is duplicated!`;
    }
    cmdMap.set(key, cmdValue);
    if (concatenatable && argArray.length > 1) {
      return this.addCmd(argArray.join(""), cmdValue);
    }
    return this;
  }

  addCmdsForCategory(category, subCategory = null, value = null) {
    if (!subCategory) {
      const categoryObject = getCategoryCmds(category);
      // Return array of all potential cmd permutations
      const cmdArray = categoryObject.cmdSubCategory.flatMap((sc) => {
        const { cmds, concatenatable } = sc;
        // Manually handle concatenation here since different sub categories
        // can have different 'concatenatable' values
        return !concatenatable
          ? cmds
          : [...cmds, ...cmds.map((c) => c.replace(/\s+/g, ""))];
      });
      // Remove duplicates.
      const cmdSet = new Set(cmdArray);
      return this.addCmds([...cmdSet], value);
    }
    const { cmds, concatenatable } = getCategoryCmds(category, subCategory);
    return this.addCmds(cmds, value, concatenatable);
  }

  // Optionally, returns the length of how many arguments in the string were parsed.
  parseArguments(argArray, includesPrefix = false) {
    const result = {
      parseLength: 0,
      exists: false,
      value: undefined,
    };
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
      const key = argArray.slice(0, l).join(" ");
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
