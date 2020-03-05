const Nightmare = require('nightmare');

const gatsCache = {
    highScoresData: {
      siteUrl: "https://gats.io/",
      lastRequest: 0,
      data: {}
    },
}

const GatsScraper = {
    getTopFive: (callback) => {
      const now = Date.now();
      // Only update cache if it's been more than 5 minutes
      if (now - gatsCache.highScoresData.lastRequest > 300000) {
        console.log('scraping gats');
        const nightmare = Nightmare({ show: false });
        nightmare.goto(gatsCache.highScoresData.siteUrl)
          .wait('#highScoresData#highScoresData > br:nth-child(5)')
          .evaluate(() => document.getElementById('highScoresData').innerText)
          .end()
          .then(text => {
            let data = text.split('\n');
            data.shift();
            data = data.map(row => {
              const elems = row.split(' ');
              return {
                position: elems[0][0],
                player: elems[1].slice(0, -1),
                points: elems[2]
              }
            });
            gatsCache.highScoresData.lastRequest = now;
            gatsCache.highScoresData.data = data;
            callback(data);
          })
          .catch(err => {
            console.error(err);
          });
      } else {
        callback(gatsCache.highScoresData.data);
      }
    }
}

module.exports = {
  GatsScraper
}