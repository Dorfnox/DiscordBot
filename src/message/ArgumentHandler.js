const { prefixes } = require("../../configWaffleBot").chat;

class ArgumentHandler {
  constructor(prefixArray = prefixes, unmappedArgFunc = () => {}) {
    this.argMap = new Map();
    this.lengthArray = [];
    this.largestCmdLength = 0;
    this.prefixSet = new Set(prefixes);
    this.unmappedArgFunc = unmappedArgFunc;
  }

  addCmds(args, cmdFunc = null) {
    if (!Array.isArray(args)) {
      return this.addCmd(args);
    }
    args.forEach((a) => this.addCmd(a, cmdFunc));
    return this;
  }

  // A command can be a string 'example' or multiple words 'this should all be executable'
  addCmd(cmd, cmdFunc = null) {
    const args = cmd.split(/\s/g).filter((item) => item);
    if (!this.argMap.has(args.length)) {
      // Set argMap to: Map<argsLen, Map<cmd, cmdFunc>>
      this.argMap.set(args.length, new Map());
      this.lengthArray.push(args.length);
      this.lengthArray.sort((a, b) => a - b);
      this.largestCmdLength = Math.max(args.length, this.largestCmdLength);
    }
    // Returns a Map<cmd, cmdFunc>
    const cmdMap = this.argMap.get(args.length);
    const key = args.map((a) => a.replace(/\s/g, "").toLowerCase()).join("_");
    if (cmdMap.has(key)) {
      throw `Arguments must be unique. ${key} is duplicated!`;
    }
    cmdMap.set(key, cmdFunc);
    return this;
  }

  // Optionally, returns the length of how many arguments in the string were parsed.
  hasArgument(argArray, includesPrefix = false) {
    if (!argArray || !argArray.length) {
      return 0;
    }
    if (!Array.isArray(argArray)) {
      argArray = argArray.split(/\s/g);
    }
    argArray = argArray.filter((i) => i).map((a) => a.toLowerCase());
    let prefixParsed = 0;
    if (includesPrefix) {
      if (!this.hasPrefix(argArray[0])) {
        return 0;
      }
      argArray = argArray.slice(1);
      prefixParsed++;
    }
    // Parse from lowest -> highest
    const cmdsParsed = this.lengthArray.find((l) =>
      this.argMap.get(l).has(argArray.slice(0, l).join("_"))
    );
    console.log(cmdsParsed);
    return cmdsParsed ? cmdsParsed + prefixParsed : 0;
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
