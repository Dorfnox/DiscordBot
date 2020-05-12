# WaffleBot
A Discord Bot that scrapes stats.gats.io for stats, plays music, and does other cool things!


## Features

### Gats Stats!

> Scrapes https://stats.gats.io/ and can return most of it's data! Examples of queries look like:
> `waffle playerstats dorfnox`
> `w ps MEADOWVOID`
> `🧇 clanstats KCSS`
> `w best snipers`
> `w top kills`
> `w top5` < Returns the current top five players on the daily leaderboard (including fun facts!).

### Music!
> Plays and queues up to 12 songs (currently - more server-configs available in future!)

### WaffleMail
> DM WaffleBot to open a channel directly to staff of a server. Better than receiving individual pings from members!

### WaffleBomber
> Tired of finessing your admin rights for bots to not show up in a channel? Activate the WaffleBomber using `w screwbots` to hire the wafflebomber to destroy all other bot messsages clogging up a channel

### ... And Plenty More Features
> Try `w help` for a list of other features. For example, `w help music` will give you a list of music commands!


## Getting Started

### Downloading

```
git clone https://github.com/Dorfnox/DiscordBot.git
```

### Installing

Will add more details here.

#### configWaffleBot.json

Rename `configWaffleBotExample.json` to `configWaffleBot.json`, and add your bot's token to the `init.token` field.

If you want to enable features that require saving user data, create a MongoDB account and add the details to the config file under `mongoDB`. The following features require a database to access:

### Running

Simply run `node .`. If running asynchronously, or on server, you can use `./start.sh async`.

## Author

* **Brendan Pierce** - *WaffleBot Creator* - [Brendan Pierce](https://github.com/Dorfnox/)

## License

MIT License.

## Acknowledgments

None as of yet!
