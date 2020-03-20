const Nightmare = require("nightmare");
const WaffleResponse = require("./WaffleResponse");
const axios = require('axios').default;

class GatsScraper {
  gatsCache = {
    highScoresData: {
      siteUrl: "https://gats.io/",
      lastRequest: 0,
      data: {}
    }
  };

  clanStats(args) {
    const wr = new WaffleResponse();
    return new Promise(resolve => {
      if (!args || !args[0]) {
        return resolve(wr.setResponse('⚠️ Please provide a clan name argument. eg: KCGO'));
      }
      const clanName = args[0];
      const url = `https://stats.gats.io/clan/${clanName}`
      const req = axios.get(url)
        .then(response => {
          console.log(response);
        }).catch(err => {
          console.log('ERR', err);
        });
    })
    .catch(err => {
      return wr.setResponse('⚠️ Unknown error occurred').setError(err).setIsSendable(false);
    })
  }

  getTopFive() {
    const wr = new WaffleResponse();
    const now = Date.now();
    // Only update cache if it's been more than 5 minutes
    if (now - this.gatsCache.highScoresData.lastRequest > 300000) {
      return Nightmare({ show: false, gotoTimeout: 15000, waitTimeout: 15000 })
        .goto(this.gatsCache.highScoresData.siteUrl)
        .wait("#highScoresData#highScoresData > br:nth-child(5)")
        .evaluate(() => document.getElementById("highScoresData").innerText)
        .end()
        .then(text => {
          let data = text.split("\n");
          data.shift();
          data = data.map(row => {
            const elems = row.split(" ");
            return {
              position: elems[0][0],
              player: elems[1].slice(0, -1),
              points: elems[2]
            };
          });
          this.gatsCache.highScoresData.lastRequest = now;
          this.gatsCache.highScoresData.data = data;
          return Promise.resolve(wr.setResponse(data));
        })
        .catch(err => {
          wr.setResponse("*⚠️ Failed to scrape gats for data*")
            .setErrorLocale("getTopFive")
            .setError(err);
          return Promise.reject(wr);
        });
    }
    return Promise.resolve(wr.setResponse(this.gatsCache.highScoresData.data));
  }
}

module.exports = GatsScraper;